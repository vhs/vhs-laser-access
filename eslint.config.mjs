import js from '@tyisi/config-eslint/js'

js[0].files.push('bin/www')

js[0].languageOptions.globals.angular = false
js[0].languageOptions.globals.io = false

js[0].languageOptions.globals.describe = false
js[0].languageOptions.globals.it = false
js[0].languageOptions.globals.before = false
js[0].languageOptions.globals.after = false

export default js
