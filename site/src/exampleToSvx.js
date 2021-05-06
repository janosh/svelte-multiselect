import fs from 'fs'

const ex = fs.readFileSync(`src/components/Example.svelte`)

const exToMd = `\`\`\`svelte\n${ex}\`\`\`\n`

fs.writeFileSync(`src/example.svx`, exToMd)
