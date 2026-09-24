// Portable fallback when the installed Sites packaging helper is unavailable.
// Credentials arrive only on hidden stdin and are passed to Git through memory-only environment.
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
if(process.stdin.isTTY)process.stdin.setRawMode(true);
process.stdin.resume();
process.stdout.write('Ready for publication JSON on stdin (input is hidden).\n');
let input='';
process.stdin.on('data',chunk=>{input+=chunk.toString();if(!/[\r\n]/.test(input))return;process.stdin.pause();if(process.stdin.isTTY)process.stdin.setRawMode(false);main(JSON.parse(input.trim()));});
function main({credential,archivePath}){
 const token=credential.token;
 const env={...process.env,GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'http.extraheader',GIT_CONFIG_VALUE_0:`Authorization: Bearer ${token}`};
 const run=(cmd,args,useAuth=false)=>{if(cmd==='git')args=['-c',`safe.directory=${process.cwd().replaceAll('\\','/')}`,...args];const r=spawnSync(cmd,args,{encoding:'utf8',env:useAuth?env:process.env,windowsHide:true});if(r.status!==0){process.stderr.write((r.stderr||r.error?.message||'Command failed').replaceAll(token,'[REDACTED]'));process.exit(r.status||1);}return r.stdout.trim();};
 const hosting=JSON.parse(fs.readFileSync('.openai/hosting.json','utf8'));
 if(!fs.existsSync('.git'))run('git',['init','--initial-branch',credential.branch]);
 run('git',['config','user.name','MargMitra Build']);run('git',['config','user.email','build@margmitra.local']);
 if(!run('git',['remote']).split('\n').includes('origin'))run('git',['remote','add','origin',credential.remote_url]);
 if(run('git',['remote','get-url','origin'])!==credential.remote_url)throw Error('Source remote mismatch');
 run('git',['add','.']);if(run('git',['status','--porcelain']))run('git',['commit','-m','Build MargMitra traffic intelligence prototype']);
 run('git',['push','--set-upstream','origin',credential.branch],true);
 const sha=run('git',['rev-parse','HEAD']);const remote=run('git',['ls-remote','origin',`refs/heads/${credential.branch}`],true).split(/\s/)[0];if(sha!==remote)throw Error('Source verification failed');
 if(!fs.existsSync('dist/index.html'))throw Error('Production build missing');
 run('tar',['-czf',archivePath,'.openai/hosting.json','dist']);
 const entries=run('tar',['-tzf',archivePath]);if(!entries.includes('dist/index.html')||entries.includes('node_modules')||entries.includes('.env'))throw Error('Archive validation failed');
 process.stdout.write(JSON.stringify({project_id:hosting.project_id,commit_sha:sha,archive:path.resolve(archivePath)})+'\n');process.exit(0);
}
