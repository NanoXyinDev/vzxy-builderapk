const crypto = require('crypto');
const { getCurrentUser } = require('./_lib/session-user');
const { assertSameOrigin } = require('./_lib/security');
const { config } = require('./_lib/github-db');
const { addBuild } = require('./_lib/db');

function msg(e){return e&&typeof e==='object'?String(e.message||e.error||JSON.stringify(e)):String(e||'Unknown error')}
function clean(v,fallback){const s=String(v||fallback).trim();if(!/^[a-zA-Z0-9._-]{1,60}$/.test(s))throw new Error('Invalid build tag');return s}
function body(req){return req.body&&typeof req.body==='object'?req.body:{}}
function ghHeaders(token){return{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json','User-Agent':'ZXVCODE-Web'}}

const workflowYaml=`name: ZXVCODE Build APK
run-name: ZXVCODE • \${{ inputs.tag }}

on:
  workflow_dispatch:
    inputs:
      zip_url:
        description: "HTTPS URL of the source ZIP"
        required: true
        type: string
      tag:
        description: "Build tag"
        required: true
        type: string
      build_type:
        description: "APK build type"
        required: true
        default: "release"
        type: choice
        options:
          - debug
          - release
      only_analyze:
        description: "Run analysis only"
        required: false
        default: "false"
        type: choice
        options:
          - "false"
          - "true"

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - name: Download source ZIP
        env:
          ZIP_URL: \${{ github.event.inputs.zip_url }}
        run: |
          set -euo pipefail
          case "$ZIP_URL" in
            https://*.private.blob.vercel-storage.com/*) ;;
            *) echo "Rejected source URL: only Vercel Private Blob is allowed."; exit 2 ;;
          esac
          curl -fsSL --retry 3 --retry-delay 2 \
            -H "Accept: application/zip" \
            "$ZIP_URL" -o project.zip
          unzip -t project.zip >/dev/null
          test $(stat -c%s project.zip) -le $((250*1024*1024))

      - name: Inspect archive
        run: |
          set -euo pipefail
          rm -rf project_raw
          unzip -q project.zip -d project_raw
          if [ "$(find project_raw -maxdepth 1 -mindepth 1 -type d | wc -l)" -eq 1 ] && [ "$(find project_raw -maxdepth 1 -mindepth 1 -type f | wc -l)" -eq 0 ]; then
            PROJECT_DIR=$(find project_raw -maxdepth 1 -mindepth 1 -type d | head -n 1)
          else
            PROJECT_DIR=project_raw
          fi
          echo "PROJECT_DIR=$PROJECT_DIR" >> "$GITHUB_ENV"
          echo "Project directory: $PROJECT_DIR"

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "17"
          cache: gradle

      - name: Setup Flutter
        if: \${{ hashFiles('**/pubspec.yaml') != '' }}
        uses: subosito/flutter-action@v2
        with:
          flutter-version: "3.41.9"
          channel: stable
          cache: true

      - name: Analyze source
        working-directory: \${{ env.PROJECT_DIR }}
        run: |
          set +e
          if [ -f pubspec.yaml ]; then
            flutter pub get
            flutter analyze
            exit $?
          elif [ -f gradlew ] || [ -f gradlew.bat ] || [ -f settings.gradle ] || [ -f settings.gradle.kts ] || [ -f build.gradle ] || [ -f build.gradle.kts ]; then
            echo "Gradle project detected. Syntax/build validation will continue in the build step."
            exit 0
          else
            echo "No Flutter or Gradle Android entrypoint found."
            exit 2
          fi

      - name: Stop after analysis
        if: \${{ github.event.inputs.only_analyze == 'true' }}
        run: exit 0

      - name: Build APK
        working-directory: \${{ env.PROJECT_DIR }}
        run: |
          set -euo pipefail
          if [ -f pubspec.yaml ]; then
            flutter pub get
            flutter build apk --\${{ github.event.inputs.build_type }}
          elif [ -f gradlew ]; then
            chmod +x gradlew
            if [ "\${{ github.event.inputs.build_type }}" = "debug" ]; then
              ./gradlew assembleDebug --no-daemon
            else
              ./gradlew assembleRelease --no-daemon
            fi
          elif [ -f gradlew.bat ]; then
            if [ "\${{ github.event.inputs.build_type }}" = "debug" ]; then
              ./gradlew.bat assembleDebug --no-daemon
            else
              ./gradlew.bat assembleRelease --no-daemon
            fi
          else
            echo "No supported APK build entrypoint found."
            exit 2
          fi

      - name: Collect APK
        run: |
          set -euo pipefail
          APK=$(find "$PROJECT_DIR" -type f -name '*.apk' | head -n 1)
          test -n "$APK"
          cp "$APK" ./ZXVCODE-\${{ github.event.inputs.build_type }}-\${{ github.event.inputs.tag }}.apk

      - name: Upload APK artifact
        uses: actions/upload-artifact@v4
        with:
          name: ZXVCODE-\${{ github.event.inputs.build_type }}-\${{ github.event.inputs.tag }}
          path: ./ZXVCODE-\${{ github.event.inputs.build_type }}-\${{ github.event.inputs.tag }}.apk
          retention-days: 1
          if-no-files-found: error
`;

async function github(path, options={}){
  const c=config();
  const r=await fetch(`https://api.github.com${path}`,{...options,headers:{...ghHeaders(c.token),...(options.headers||{})}});
  const raw=await r.text();let d;try{d=raw?JSON.parse(raw):{}}catch{d={message:raw}};
  if(!r.ok)throw Object.assign(new Error(d.message||`GitHub API ${r.status}`),{status:r.status});
  return d;
}
async function ensureWorkflow(){
  const c=config();
  const path='.github/workflows/build.yml';
  const encoded=encodeURIComponent(path);
  const desired=workflowYaml.trim().replace(/\r\n/g,'\n');
  try{
    const current=await github(`/repos/${c.owner}/${c.repo}/contents/${encoded}?ref=${encodeURIComponent(c.branch)}`);
    const currentText=typeof current.content==='string'?Buffer.from(current.content.replace(/\n/g,''),'base64').toString('utf8').trim().replace(/\r\n/g,'\n'):'';
    if(currentText===desired)return false;
    const content=Buffer.from(workflowYaml).toString('base64');
    await github(`/repos/${c.owner}/${c.repo}/contents/${encoded}`,{method:'PUT',body:JSON.stringify({message:'ci: update ZXVCODE APK builder workflow',content,branch:c.branch,sha:current.sha})});
    return true;
  }catch(e){
    if(e.status!==404)throw e;
    const content=Buffer.from(workflowYaml).toString('base64');
    await github(`/repos/${c.owner}/${c.repo}/contents/${encoded}`,{method:'PUT',body:JSON.stringify({message:'ci: add ZXVCODE APK builder workflow',content,branch:c.branch})});
    return true;
  }
}

module.exports=async(req,res)=>{
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'Method not allowed'});
  assertSameOrigin(req);
  const user=await getCurrentUser(req);if(!user)return res.status(401).json({ok:false,error:'Login required'});
  const b=body(req);const onlyAnalyze=b.only_analyze===true||b.only_analyze==='true';
  if(!onlyAnalyze&&!['pro','admin'].includes(user.role))return res.status(403).json({ok:false,error:'Build APK membutuhkan role Pro atau Admin. Free dapat menjalankan Analyze Only.'});
  try{
    const c=config();if(!c.token)return res.status(503).json({ok:false,error:'GITHUB_TOKEN is not configured in Vercel Environment Variables'});
    const tag=clean(b.tag,`build-${Date.now()}`),pathname=String(b.pathname||'').replace(/^\/+/,''),buildType=String(b.build_type||'release').toLowerCase();
    if(!pathname.startsWith(`build-inputs/${user.id}/`) || pathname.includes('..'))throw new Error('Invalid source pathname');
    if(!['debug','release'].includes(buildType))throw new Error('build_type must be debug or release');
    const { head, issueSignedToken, presignUrl } = await import('@vercel/blob');
    const storeId=String(process.env.BLOB_STORE_ID||'store_MM3stWQMbwkbomJ2');
    const sourceInfo=await head(pathname,{storeId});
    if(Number(sourceInfo.size||0)<=0)throw new Error('Source ZIP is empty');
    const sourceType=String(sourceInfo.contentType||'').toLowerCase();
    if(sourceType && !['application/zip','application/x-zip-compressed','application/octet-stream'].includes(sourceType))throw new Error('Source object is not a ZIP');
    if(Number(sourceInfo.size||0)>250*1024*1024)throw new Error('Source ZIP exceeds the 250 MB limit');
    const validUntil=Date.now()+60*60*1000;
    const delegation=await issueSignedToken({storeId,pathname,operations:['get'],validUntil});
    const {presignedUrl:zipUrl}=await presignUrl(delegation,{storeId,pathname,operation:'get',access:'private',validUntil});
    const workflow=String(process.env.GITHUB_WORKFLOW||'build.yml'),ref=String(process.env.GITHUB_REF||c.branch||'main');
    const workflowCreated=await ensureWorkflow();
    await github(`/repos/${c.owner}/${c.repo}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`,{method:'POST',body:JSON.stringify({ref,inputs:{zip_url:zipUrl,tag,build_type:buildType,only_analyze:onlyAnalyze?'true':'false'}})});
    const id=crypto.randomUUID();
    await addBuild({id,user_id:user.id,tag,source:'vercel-blob',workflow,ref,build_type:buildType,only_analyze:onlyAnalyze,status:'queued',actions_url:`https://github.com/${c.owner}/${c.repo}/actions/workflows/${workflow}`,created_at:new Date().toISOString()});
    return res.status(202).json({ok:true,id,tag,buildType,onlyAnalyze,workflow,workflowCreated,repo:`${c.owner}/${c.repo}`,actionsUrl:`https://github.com/${c.owner}/${c.repo}/actions/workflows/${workflow}`});
  }catch(e){return res.status(Number(e.status)===403?502:Number(e.status)||500).json({ok:false,error:msg(e)})}
};
