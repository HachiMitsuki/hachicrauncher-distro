// gen_create.js — HachiCrauncher 用 Create鯖(NeoForge) プロファイル生成スクリプト
// gen_pixelmon.js を複製し、Create鯖(CT106)専用に変更したもの（2026-11-03）。
//
// MOD は CurseForge インスタンスではなく Modrinth の version id の一覧から取る。
// MOD 本体は自前ホストせず、Modrinth 公式CDNの URL を直接参照する（再配布規約対応）。
// MD5 を測るためだけに一度ダウンロードする（保存しない）。
// あわせて、同じ接続先(172.237.20.45:25565)を指す古い鯖の項目を「（停止中）」にして
// 自動接続を切り、Create鯖を mainServer にする（2026-11-03 本人の判断シート）。
//
// 2026-11-04 1.1.2: 友だちが自分で足した MOD の扱い（hachiUserMods）を足した。MOD の中身は 1.1.1 と同じ。
//
// 使い方: node gen_create.js
const fs = require('fs'), path = require('path'), crypto = require('crypto'), cp = require('child_process')
const AdmZip = require('D:/Repos/HeliosLauncher/node_modules/adm-zip')

const CFG = {
    NEO_VER: '21.1.265',
    MC_VER: '1.21.1',
    SERVER_ID: 'hachi-create-1.21.1',
    SERVER_NAME: 'Create鯖',
    SERVER_ADDR: '172.237.20.45:25565',
    SERVER_LIST_NAME: 'はちみつ Create サーバー',   // マルチプレイの一覧に出る名前
    PAGES: 'https://hachimitsuki.github.io/hachicrauncher-distro/repo',
    DISTRO_DIR: __dirname,   // このスクリプトがあるリポジトリ（別の作業用コピーで回しても、そのコピーに書く）
    // 作業フォルダはこのリポの中（.gitignore で外す）。D:/claude の中に置くと、PC 間同期の
    // 秘密の値の見張りが仮の launcher_profiles.json に反応して同期が止まる（2026-11-04 に移した）
    // 別の作業用コピーで回したときも、126MB を作り直さないよう本体のリポの物を使い回す
    WORK: 'D:/Repos/hachicrauncher-distro/neoforge_work_21.1.265',
    UA: 'HachiCrauncher/1.0.0'
}
// サーバー(CT106)と同じ版。クライアント用 45 個（サーバー専用6個と Terralith を除き、表示を軽くする4個を足したもの）
// 2026-11-03 収納と敵強化の 4 個を足した。Dungeon Difficulty は Modrinth では「クライアント非対応」表示だが、
// 効果（dungeon_difficulty:no_mining）を登録するので、クライアントに無いと接続を拒まれる（1.1.1 で追加）
const MOD_VERSIONS = [
    'UjX6dr61', 'qUpvzZ83', 'b0u9vk8C', 'hsjVajlP', 'Xe7EqzfQ', 'qrcMVoBD', 'uQsIRky8', 'D6mQaFRW',
    'uhJhCT7X', 'gBrfZy6S', 'HOPX5oro', 'IwtuwMZy', 'bOiDu0LS', 'hZ6B2Z0x', 'gMWQ1LX9', '44pLdPGg',
    'fg9dTRz9', 'AEMRNsNS', 'fFDOEXAA', 'GBSlpwLT', 'qZxkZR8W', 'sCwiqLqq', 'XTVZDOol', '2prKITKh',
    'BYUUUeZA', 'yWmXD7GW', 'irjR7dHk', 'SnQ4SoDe', 'iv3KiVkE', 'sL7Ghaz1', 'eYz2YBGT', 'uAKA6Laj',
    'ZDZENbHH', 'x7kQWVju', 'DDUrRVCA', 'v5qtqRQi', 'LuFhm4eU',
    'uMOpc5uV', 'eieYbWYb', 'EJzmEPZV', 'dR2F5bfH',
    'px0CCB06',   // Storage Drawers 1.21.1-13.11.4
    'bgyn3PYl',   // Improved Mobs 1.21.1-1.16.0.b（クライアントでは難易度メーターの表示用）
    'fcNC0Ok0',   // TenshiLib 1.21.1-2.3.1（Improved Mobs の前提）
    'uwoMCnrI'    // Dungeon Difficulty 3.9.2+1.21.1-neoforge
]
const OLD_SAME_ADDR = ['hachi-neoforge-1.21.1', 'hachi-pixelmon-1.21.1']
const STOPPED_SUFFIX = '（停止中）'

// 友だちが自分で足した MOD（2026-11-04 本人の判断シート 2 枚: 何でも残す・怪しい物は Discord に知らせる・
// 配っている MOD と同じ ID の別の版は「外したMOD」フォルダへ移す・MOD の ID で見分ける）。
// ランチャー v1.1 系の app/assets/js/usermods.js がこの hachiUserMods を読む。
// 確かめ済み: はちみつきが自分のアカウントで入れて Create鯖に入れた MOD（ランチャーの 設定 → Mods に出る）。
// 足すときは ① jar の中を見て、ブロック・アイテム・効果などを登録していないか確かめる
// ② 自分のアカウントで入れて Create鯖に入れるか試す ③ 配っている MOD と同じ ID は入れられない（下で止まる）
const CHECKED_USER_MODS = [
    { modId: 'iris', name: 'Iris Shaders', note: '影（シェーダー）。NeoForge・1.21.1 用の 1.8.14 以降を入れる（配っている Sodium 0.8 に合う版。1.8.14-beta.1 で確かめた）', url: 'https://modrinth.com/mod/iris' },
    { modId: 'mousetweaks', name: 'Mouse Tweaks', note: 'マウスでアイテムをまとめて動かす', url: 'https://modrinth.com/mod/mouse-tweaks' }
]
// 怪しい MOD（見つけたら Discord に知らせる・消さない）。2026-11-04 に Web・Reddit（agy）と Modrinth で調べ、
// NeoForge 1.21.1 版がある物は jar の中の ID を読んで書いた。ID の名前の一部（keywords）でも引っかける。
// level: 「ずる」＝多くの鯖で禁止／「グレー」＝鯖によって許される
const SUSPICIOUS_USER_MODS = [
    { label: '透視（地面や壁の向こうの鉱石・チェストが見える）', level: 'ずる', modIds: ['rexray'], keywords: ['xray', 'orefinder', 'oreesp', 'caveesp'], except: ['antixray'] },
    { label: '自動操作（自動で歩く・掘る bot）', level: 'ずる', modIds: ['baritone'], keywords: ['baritone'] },
    { label: 'ハッククライアント・シード解析', level: 'ずる', modIds: [], keywords: ['meteorclient', 'wurst', 'aristois', 'liquidbounce', 'killaura', 'seedcracker', 'rusherhack', 'futureclient', 'bleachhack'] },
    { label: '自動クリック', level: 'ずる', modIds: ['autoclicker', 'enthusia_autoclicker', 'clickmate'], keywords: ['autoclick'] },
    { label: '自動トーテム（死にそうなとき自動で持ち替える）', level: 'ずる', modIds: ['autototem', 'instantautototem'], keywords: ['autototem'] },
    { label: 'フリーカメラ（体を置いたまま視点だけ動かしてのぞける）', level: 'グレー', modIds: ['freecam', 'legacyfreecam', 'freecam_by_jasonzli', 'zergatulfreecam', 'smooth_freecam'], keywords: ['freecam'] },
    { label: '明るさ最大（暗い洞窟や夜でも昼のように見える）', level: 'グレー', modIds: ['fullbright', 'neofullbright', 'resource_gamma_util', 'gjeb', 'optimized_fullbright', 'fullbright_neoforged', 'gama', 'simple_gamma_1_21_1_neoforge', 'fullbrightnesstoggle'], keywords: ['fullbright', 'gamma'] },
    { label: '自動釣り', level: 'グレー', modIds: ['autofish', 'tideautofish'], keywords: ['autofish'] },
    { label: '自動建築（設計図どおりに自動でブロックを置く）', level: 'グレー', modIds: ['buildprint'], keywords: ['litematicaprinter', 'schematicprinter'] }
]
// 怪しい MOD の知らせ（はちみつきだけが見るチャンネルに出す）。ランチャー 1.1.2 から、受付口（hachiApi の /v1/report）に送り、
// 受付口の bot が Discord に出す。配布一覧には「知らせる／知らせない」（hachiUserMods.report）だけを書き、鍵は一切書かない。
// 以前は Discord の Webhook を base64 にしてここに書いていたが、公開の配布一覧から誰でも取り出せたので外した
// （2026-11-05 判断シート「Webhook漏えいの直し方を決める」）。知らせを止めたいときは REPORT_SUSPICIOUS_MODS を false にする
const REPORT_SUSPICIOUS_MODS = true

// jar の META-INF/neoforge.mods.toml の [[mods]] にある modId（依存の欄は読まない）。ランチャーの usermods.js と同じ読み方
function jarModIds(buf){
    const zip = new AdmZip(buf)
    const entry = zip.getEntry('META-INF/neoforge.mods.toml') || zip.getEntry('META-INF/mods.toml')
    if(!entry) return []
    const ids = []; let section = '', inMultiline = null
    for(const line of zip.readAsText(entry, 'utf8').split(/\r?\n/)){
        if(inMultiline){ if(line.includes(inMultiline)) inMultiline = null; continue }
        const t = line.trim()
        const header = /^\[\[?\s*([^\]]+?)\s*\]\]?/.exec(t)
        if(header){ section = header[1]; continue }
        const id = /^modId\s*=\s*["']([^"']+)["']/.exec(t)
        if(id && section === 'mods') ids.push(id[1])
        for(const q of ["'''", '"""']){ if((t.split(q).length - 1) % 2 === 1){ inMultiline = q; break } }
    }
    return ids
}

const REPO = path.join(CFG.DISTRO_DIR, 'repo')
const md5 = b => crypto.createHash('md5').update(b).digest('hex')
const sha1 = b => crypto.createHash('sha1').update(b).digest('hex')

async function dl(url){ const r=await fetch(url,{headers:{'User-Agent':CFG.UA}}); if(!r.ok) throw new Error(`DL ${r.status} ${url}`); return Buffer.from(await r.arrayBuffer()) }
async function getJson(url){ const r=await fetch(url,{headers:{'User-Agent':CFG.UA}}); if(!r.ok) throw new Error(`JSON ${r.status} ${url}`); return r.json() }
function save(rel,buf){ const d=path.join(REPO,rel); fs.mkdirSync(path.dirname(d),{recursive:true}); fs.writeFileSync(d,buf); return buf }
function mavenPath(id){ const p=id.split(':'); const cl=p[3]?('-'+p[3]):''; return `${p[0].replace(/\./g,'/')}/${p[1]}/${p[2]}/${p[1]}-${p[2]}${cl}.jar` }
function findJava(){
    const root='C:/Users/mitsu/AppData/Roaming/.helioslauncher/runtime'
    const stack=[root]; while(stack.length){ const d=stack.pop(); let es=[]; try{es=fs.readdirSync(d,{withFileTypes:true})}catch(_){continue}
        for(const e of es){ const f=path.join(d,e.name); if(e.isDirectory()) stack.push(f); else if(e.name==='java.exe') return f } }
    return 'java'
}
function hostedLib(srcAbs, id, classpath){
    const rel=mavenPath(id); const buf=fs.readFileSync(srcAbs); save(path.join('lib',rel),buf)
    const m={ id, name:id, type:'Library', artifact:{ size:buf.length, MD5:md5(buf), url:`${CFG.PAGES}/lib/${rel}` } }
    if(classpath===false) m.classpath=false
    return m
}

async function main(){
    fs.mkdirSync(CFG.WORK,{recursive:true})
    const NEO=CFG.NEO_VER
    // 1) installer + version.json（版ごとに作業フォルダを分ける）
    const instJar=path.join(CFG.WORK,'installer.jar')
    if(!fs.existsSync(instJar)) fs.writeFileSync(instJar, await dl(`https://maven.neoforged.net/releases/net/neoforged/neoforge/${NEO}/neoforge-${NEO}-installer.jar`))
    const zip=new AdmZip(instJar)
    const vjText=zip.readAsText('version.json'); const vj=JSON.parse(vjText); const vjId=vj.id
    if(!vjId.includes(NEO)) throw new Error(`installer version mismatch: ${vjId}`)
    const vjBuf=save(`versions/${vjId}/${vjId}.json`, Buffer.from(vjText))
    const gargs=(vj.arguments&&vj.arguments.game)||[]
    const nf = gargs[gargs.indexOf('--fml.neoFormVersion')+1]
    const MCNF = `${CFG.MC_VER}-${nf}`
    console.log('version.json id', vjId, '| mc-neoform', MCNF, '| libs', vj.libraries.length)

    // 2) installer --installClient
    const inst=path.join(CFG.WORK,'install')
    const cli=path.join(inst,'libraries/net/neoforged/neoforge',NEO,`neoforge-${NEO}-client.jar`)
    if(!fs.existsSync(cli)){
        fs.mkdirSync(inst,{recursive:true})
        fs.writeFileSync(path.join(inst,'launcher_profiles.json'),'{"profiles":{},"selectedProfile":"","clientToken":"x"}')
        const java=findJava(); console.log('java:',java,'\nrunning --installClient ...')
        cp.execFileSync(java,['-jar',instJar,'--installClient',inst],{stdio:'inherit'})
    }
    const libDir=path.join(inst,'libraries')

    // 3) version.json libraries → Library
    const libMods=[]
    for(const lib of vj.libraries){ const a=lib.downloads&&lib.downloads.artifact; if(!a||!a.url) continue
        const buf=await dl(a.url); libMods.push({ id:lib.name, name:lib.name, type:'Library', artifact:{ size:buf.length, MD5:md5(buf), url:a.url } }) }
    console.log('version.json libs hashed:', libMods.length)

    // 4) game-layer 4ファイル
    const gameMods=[
        hostedLib(path.join(libDir,mavenPath(`net.neoforged:neoforge:${NEO}:universal`)), `net.neoforged:neoforge:${NEO}:universal`, false),
        hostedLib(path.join(libDir,mavenPath(`net.neoforged:neoforge:${NEO}:client`)),    `net.neoforged:neoforge:${NEO}:client`,    false),
        hostedLib(path.join(libDir,mavenPath(`net.minecraft:client:${MCNF}:srg`)),         `net.minecraft:client:${MCNF}:srg`,        false),
        hostedLib(path.join(libDir,mavenPath(`net.minecraft:client:${MCNF}:extra`)),       `net.minecraft:client:${MCNF}:extra`,      false),
    ]

    // 5) ForgeHosted 本体
    const uniBuf=fs.readFileSync(path.join(libDir,mavenPath(`net.neoforged:neoforge:${NEO}:universal`)))
    const forgeHosted={ id:`net.neoforged:neoforge:${NEO}`, name:`NeoForge ${NEO}`, type:'ForgeHosted',
        artifact:{ size:uniBuf.length, MD5:md5(uniBuf), url:`https://maven.neoforged.net/releases/net/neoforged/neoforge/${NEO}/neoforge-${NEO}-universal.jar` },
        subModules:[ { id:vjId, name:'NeoForge Version Manifest', type:'VersionManifest', artifact:{ size:vjBuf.length, MD5:md5(vjBuf), url:`${CFG.PAGES}/versions/${vjId}/${vjId}.json` } }, ...libMods, ...gameMods ] }

    // 6) MOD: Modrinth の version id から（公式CDN直参照・sha1 で取得物を照合してから MD5 を測る）
    const ids=encodeURIComponent(JSON.stringify(MOD_VERSIONS))
    const vers=await getJson(`https://api.modrinth.com/v2/versions?ids=${ids}`)
    if(vers.length!==MOD_VERSIONS.length) throw new Error(`expected ${MOD_VERSIONS.length} versions, got ${vers.length}`)
    const pids=encodeURIComponent(JSON.stringify([...new Set(vers.map(v=>v.project_id))]))
    const projs=await getJson(`https://api.modrinth.com/v2/projects?ids=${pids}`)
    const title={}; for(const p of projs) title[p.id]=p.title
    const modMods=[]
    const distributedModIds=new Set()
    for(const vid of MOD_VERSIONS){ const v=vers.find(x=>x.id===vid)
        const file=v.files.find(x=>x.primary)||v.files[0]
        const buf=await dl(file.url)
        if(sha1(buf)!==file.hashes.sha1) throw new Error(`sha1 mismatch ${file.filename}`)
        for(const id of jarModIds(buf)) distributedModIds.add(id)
        modMods.push({ id:`mod:${file.filename.replace(/[^a-z0-9]/gi,'_')}`, name:title[v.project_id]||file.filename, type:'File',
            artifact:{ size:buf.length, MD5:md5(buf), path:`mods/${file.filename}`, url:file.url } })
        console.log('mod ok:', file.filename) }
    // 確かめ済みの MOD が配っている MOD と同じ ID だと、ランチャーが「外したMOD」へ移してしまうので止める
    const clash=CHECKED_USER_MODS.filter(c=>distributedModIds.has(c.modId))
    if(clash.length) throw new Error(`checked user mods already distributed: ${clash.map(c=>c.modId).join(',')}`)
    console.log('distributed mod ids:', distributedModIds.size)

    // 6.5) servers.dat（マルチプレイの一覧に最初から Create鯖を入れる・2026-11-03）
    //      Helios は File を毎回 MD5 で照合するので、本人が足した鯖や鯖アイコンの記録は起動のたびにこの内容へ戻る
    const nbtStr=s=>{ const b=Buffer.from(s,'utf8'); const l=Buffer.alloc(2); l.writeUInt16BE(b.length); return Buffer.concat([l,b]) }
    const int32=n=>{ const b=Buffer.alloc(4); b.writeInt32BE(n); return b }
    const [srvHost,srvPort]=CFG.SERVER_ADDR.split(':')
    const srvIp=(srvPort==='25565')?srvHost:CFG.SERVER_ADDR
    const serversDat=Buffer.concat([
        Buffer.from([10]), nbtStr(''),
        Buffer.from([9]), nbtStr('servers'), Buffer.from([10]), int32(1),
        Buffer.from([8]), nbtStr('ip'), nbtStr(srvIp),
        Buffer.from([8]), nbtStr('name'), nbtStr(CFG.SERVER_LIST_NAME),
        Buffer.from([0]),
        Buffer.from([0])
    ])
    save('create/servers.dat', serversDat)
    modMods.push({ id:'hachi-create:servers.dat', name:'マルチプレイの鯖一覧', type:'File',
        artifact:{ size:serversDat.length, MD5:md5(serversDat), path:'servers.dat', url:`${CFG.PAGES}/create/servers.dat` } })

    // 7) distribution.json 差し替え
    const distPath=path.join(CFG.DISTRO_DIR,'distribution.json')
    const dist=JSON.parse(fs.readFileSync(distPath,'utf8'))
    for(const s of dist.servers){
        if(!OLD_SAME_ADDR.includes(s.id)) continue
        s.mainServer=false; s.autoconnect=false
        if(!s.name.endsWith(STOPPED_SUFFIX)) s.name=s.name+STOPPED_SUFFIX
    }
    const entry={ id:CFG.SERVER_ID, name:CFG.SERVER_NAME, description:`Create 6.0.10 / NeoForge ${NEO} / MC ${CFG.MC_VER}`, icon:'', version:'1.1.2',
        address:CFG.SERVER_ADDR, minecraftVersion:CFG.MC_VER, discord:{shortId:CFG.SERVER_NAME,largeImageText:CFG.SERVER_NAME,largeImageKey:CFG.SERVER_ID},
        mainServer:true, autoconnect:true, modules:[forgeHosted, ...modMods],
        hachiUserMods:{ distributedModIds:[...distributedModIds].sort(), checked:CHECKED_USER_MODS, suspicious:SUSPICIOUS_USER_MODS, report:REPORT_SUSPICIOUS_MODS } }
    const i=dist.servers.findIndex(s=>s.id===CFG.SERVER_ID); if(i>=0) dist.servers[i]=entry; else dist.servers.unshift(entry)
    // 2026-11-04 PLAY の前に鯖の名簿を確かめ、無ければランチャーから参加を申し込める（ランチャー 1.1.0 から）。
    // 受付口を止めたいときは hachiWhitelist を外す（ランチャーは確かめをやめて今までどおり起動する）
    entry.hachiWhitelist=true
    entry.hachiApi='https://hachicrauncher.hachimitsuki.com'
    fs.writeFileSync(distPath, JSON.stringify(dist,null,4))
    console.log(`\n✅ done. libs:${libMods.length} game:${gameMods.length} mods:${modMods.length}`)
}
main().catch(e=>{ console.error('FATAL',e); process.exit(1) })
