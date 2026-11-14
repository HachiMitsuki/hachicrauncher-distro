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
// 2026-11-08 1.2.0: 影（Iris＋Create の仕掛けを影で崩さないつなぎの MOD＋影パック 2 つ）と、インベントリ整理
//   （Inventory Profiles Next＋libIPN）を全員に配るようにした（本人の判断シート 2 枚）。どれもクライアントだけで動くので、
//   サーバー(CT106)の mods は変えていない。影は最初オフで、使う人がゲームの中で O キーを押して影パックを選ぶ。
//   Iris の設定ファイル(config/iris.properties)は配らない（配ると起動のたびに配布の内容へ戻り、各自の選択が消えるため）
// 2026-11-09 1.3.0: Create のアドオン 11 個（Copycats+・Encased・Bits 'n' Bobs と前提 2 つ・Propulsion・Aeroworks・
//   Copycats+ の重さ対応・Numismatics・Blocks & Bogies・Escalated）を足した（本人の判断シート）。ブロックを足すので
//   サーバー(CT106)の mods にも同じ版を入れる
// 2026-11-14 1.3.1: くわ（kuwacom）の撮影用シェーダー「Ray」alpha（0.1.0a0 / nightly c7fa099）を配る。
//   Iris 向けの zip で、MOD ではない。対応は Minecraft 1.21.x–26.x と Iris 1.8+（配っている 1.8.14-beta.1 で足りる）。
//   Modrinth には無いので、GitHub で公開されたその版を repo/create/shaderpacks/ に置いて GitHub Pages から配る。
//   nightly タグは push のたびに中身が置き換わるため、ファイル名ごとピン留めする。
//   公式: https://github.com/kuwacom/ray  ライセンスは zip 内の Ray Shader License 1.0（クレジットと公式リンクを添えて pack へ同梱してよい）。
//   クライアントだけで、サーバー(CT106)の mods は変えない。
// 2026-11-14 1.4.0: クライアントだけの MOD を足す。MaFgLib 0.4.3 と、それを前提にする
//   Forgematica 0.4.3・Tweakerge 0.4.3・BoccHUD 0.4.1、それに Catalogue 1.11.2。
//   Forgematica は 0.4.2 が落ちるので 0.4.3 に固定。Catalogue は CurseForge（Modrinth に無い）で、
//   必須の前提は無し（Framework は不要。Configured は任意なので配らない）。
//   どれもクライアントだけで、サーバー(CT106)の mods は変えない。
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
// サーバー(CT106)と同じ版。クライアント用 60 個（サーバー専用6個と Terralith を除き、表示を軽くする4個と、
// 1.2.0 で足したクライアントだけの 4 個〈影 2・整理 2〉と、1.3.0 で足した Create のアドオン 11 個を足したもの）
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
    'uwoMCnrI',   // Dungeon Difficulty 3.9.2+1.21.1-neoforge
    // 1.2.0（2026-11-08）ここから下はクライアントだけ。サーバーには入れない
    'KduFYu4t',   // Iris 1.8.14-beta.1+1.21.1-neoforge（影。配っている Sodium 0.8.13 に合う版はこれだけ。
                  //   jar の中では Minecraft の版を「1.21.1 未満」と書いているが、11-04〜05 にこのPCの 1.21.1 で読み込まれて動いた）
    '6ZQz5Ow2',   // Iris & Oculus Flywheel Compat 2.4.0（Create が中に持つ Flywheel 1.0.6 で描く仕掛けを、影の下でも崩さない）
    'vjuNnHLv',   // Inventory Profiles Next 2.2.5（インベントリ整理。前提の Kotlin for Forge は上で配っている）
    'BGe4KMlE',   // libIPN 6.6.3（Inventory Profiles Next の前提）
    // 1.3.0（2026-11-09）Create のアドオン 11 個。ブロックを足すので、サーバー(CT106)にも同じ版を入れてある。
    //   どれも jar の中の版の指定が Create 6.0.10・NeoForge 21.1.265・Sable 2.0.6 に合うことを確かめた。
    //   Create: Ballast 0.1.1（XzlV3NlT）は NeoForge を「21.1.227 未満」と決めていて読み込めないので入れていない
    'zLlVJXf0',   // Create: Copycats+ 3.0.11（ほかのブロックの見た目をまねるブロック）
    'pld6Eng9',   // Create Encased 1.10.0-fix1（軸・歯車・パイプにケースをかぶせる）
    'g9Lmjjc5',   // Create: Bits 'n' Bobs 2.3.5（飾りと小さな仕掛け）
    'BOTN7zzN',   // Strut Your Stuff 1.3.1（Bits 'n' Bobs の前提）
    'dxtZVosY',   // Azimuth API 1.4.10（Bits 'n' Bobs の前提）
    'H13U56dc',   // Create Propulsion: Simulated 1.1.5（飛行船の推進器。プラチナ鉱石を足すが、事前に作った半径 1500 の中には出ない）
    '6kk7ruR3',   // Create: Aeroworks 1.5.0（飛行船のジャイロ・操縦かん）
    'wsXjRa7l',   // Copycats+ aeronautics weight 1.1.1（Copycats+ のブロックに飛行船用の重さを付ける）
    'kVi3TESX',   // Create: Numismatics 1.1.0（お金と店）
    'nC19ZMKK',   // Create: Blocks & Bogies 1.0.8（列車の台車）
    'vJ49zRJl',   // Create: Escalated 1.3.2（エスカレーター）
    // 1.4.0（2026-11-14）ここから下はクライアントだけ。サーバーには入れない
    'CgDQ0u0Q',   // MaFgLib 0.4.3+mc1.21.1（malilib の非公式移植。下の 3 つの前提）
    'PFUOWUDF',   // Forgematica 0.4.3+mc1.21.1（Litematica の非公式移植。0.4.2 は落ちるので使わない）
    '701i2Xre',   // Tweakerge 0.4.3+mc1.21.1（Tweakeroo の非公式移植）
    'tOP74nwE'    // BoccHUD 0.4.1+mc1.21.1（MiniHUD の非公式移植）
]
// 影パック（shaderpacks/ に置く。MOD ではないので jar の ID は読まない）。Modrinth の配布元を直接参照する（MOD と同じ）
const SHADER_VERSIONS = [
    'Bqen1mJX',   // Complementary Shaders - Reimagined r5.9.3（きれいな方）
    't4YRxQug'    // MakeUp - Ultra Fast 9.6（軽い方。弱い PC 向け）
]
// Modrinth に無い影パック。repo/create/shaderpacks/ に置いて GitHub Pages から配る
const HOSTED_SHADER_PACKS = [
    {
        filename: 'Ray-0.1.0a0-c7fa099-nightly.zip',
        name: 'Ray',
        sha256: '1423425e7c9a27b8258cce3bf85b3c324f47be4df8345196bd1c66030918c263',
        source: 'https://github.com/kuwacom/ray/releases/download/nightly/Ray-0.1.0a0-c7fa099-nightly.zip'
    }
]
// Modrinth に無い MOD。CurseForge 公式の CurseMaven URL を直接参照する（本体は自前ホストしない）
const CURSE_MODS = [
    {
        filename: 'catalogue-neoforge-1.21.1-1.11.2.jar',
        name: 'Catalogue',
        sha1: '6d67f855c20bc6392763cfb22e1152da4e8015b4',
        url: 'https://www.cursemaven.com/curse/maven/catalogue-459701/6926815/catalogue-459701-6926815.jar'
    }
]
const OLD_SAME_ADDR = ['hachi-neoforge-1.21.1', 'hachi-pixelmon-1.21.1']
const STOPPED_SUFFIX = '（停止中）'

// 友だちが自分で足した MOD（2026-11-04 本人の判断シート 2 枚: 何でも残す・怪しい物は Discord に知らせる・
// 配っている MOD と同じ ID の別の版は「外したMOD」フォルダへ移す・MOD の ID で見分ける）。
// ランチャー v1.1 系の app/assets/js/usermods.js がこの hachiUserMods を読む。
// 確かめ済み: はちみつきが自分のアカウントで入れて Create鯖に入れた MOD（ランチャーの 設定 → Mods に出る）。
// 足すときは ① jar の中を見て、ブロック・アイテム・効果などを登録していないか確かめる
// ② 自分のアカウントで入れて Create鯖に入れるか試す ③ 配っている MOD と同じ ID は入れられない（下で止まる）
// 1.2.0 で Iris を配るようにしたので、ここから外した（配っている MOD と同じ ID があると下で止まる）
const CHECKED_USER_MODS = [
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
const sha256 = b => crypto.createHash('sha256').update(b).digest('hex')

function pickRemoteFile(v){
    const files=(v.files||[]).filter(f=>!/(-sources|\.src)\.jar$/i.test(f.filename||''))
    if(!files.length) throw new Error(`no non-sources file for version ${v.id}`)
    return files.find(x=>x.primary)||files[0]
}
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
    const ALL_VERSIONS=[...MOD_VERSIONS, ...SHADER_VERSIONS]
    const ids=encodeURIComponent(JSON.stringify(ALL_VERSIONS))
    const vers=await getJson(`https://api.modrinth.com/v2/versions?ids=${ids}`)
    if(vers.length!==ALL_VERSIONS.length) throw new Error(`expected ${ALL_VERSIONS.length} versions, got ${vers.length}`)
    const pids=encodeURIComponent(JSON.stringify([...new Set(vers.map(v=>v.project_id))]))
    const projs=await getJson(`https://api.modrinth.com/v2/projects?ids=${pids}`)
    const title={}; for(const p of projs) title[p.id]=p.title
    const modMods=[]
    const distributedModIds=new Set()
    for(const vid of MOD_VERSIONS){ const v=vers.find(x=>x.id===vid)
        const file=pickRemoteFile(v)
        const buf=await dl(file.url)
        if(sha1(buf)!==file.hashes.sha1) throw new Error(`sha1 mismatch ${file.filename}`)
        for(const id of jarModIds(buf)) distributedModIds.add(id)
        modMods.push({ id:`mod:${file.filename.replace(/[^a-z0-9]/gi,'_')}`, name:title[v.project_id]||file.filename, type:'File',
            artifact:{ size:buf.length, MD5:md5(buf), path:`mods/${file.filename}`, url:file.url } })
        console.log('mod ok:', file.filename) }
    for (const pack of CURSE_MODS) {
        const buf = await dl(pack.url)
        if (pack.sha1 && sha1(buf) !== pack.sha1) throw new Error(`sha1 mismatch ${pack.filename}`)
        for (const id of jarModIds(buf)) distributedModIds.add(id)
        modMods.push({ id:`mod:${pack.filename.replace(/[^a-z0-9]/gi,'_')}`, name:pack.name, type:'File',
            artifact:{ size:buf.length, MD5:md5(buf), path:`mods/${pack.filename}`, url:pack.url } })
        console.log('curse mod ok:', pack.filename)
    }
    for(const vid of SHADER_VERSIONS){ const v=vers.find(x=>x.id===vid)
        const file=pickRemoteFile(v)
        const buf=await dl(file.url)
        if(sha1(buf)!==file.hashes.sha1) throw new Error(`sha1 mismatch ${file.filename}`)
        modMods.push({ id:`shaderpack:${file.filename.replace(/[^a-z0-9]/gi,'_')}`, name:title[v.project_id]||file.filename, type:'File',
            artifact:{ size:buf.length, MD5:md5(buf), path:`shaderpacks/${file.filename}`, url:file.url } })
        console.log('shaderpack ok:', file.filename) }
    for (const pack of HOSTED_SHADER_PACKS) {
        const destRel = `create/shaderpacks/${pack.filename}`
        const destAbs = path.join(REPO, destRel)
        const buf = fs.existsSync(destAbs) ? fs.readFileSync(destAbs) : await dl(pack.source)
        if (pack.sha256 && sha256(buf) !== pack.sha256) throw new Error(`sha256 mismatch ${pack.filename}`)
        save(destRel, buf)
        modMods.push({ id:`shaderpack:${pack.filename.replace(/[^a-z0-9]/gi,'_')}`, name:pack.name, type:'File',
            artifact:{ size:buf.length, MD5:md5(buf), path:`shaderpacks/${pack.filename}`, url:`${CFG.PAGES}/create/shaderpacks/${pack.filename}` } })
        console.log('hosted shaderpack ok:', pack.filename)
    }
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
    const entry={ id:CFG.SERVER_ID, name:CFG.SERVER_NAME, description:`Create 6.0.10 / NeoForge ${NEO} / MC ${CFG.MC_VER}`, icon:'', version:'1.4.0',
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
