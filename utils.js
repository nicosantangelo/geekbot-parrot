module.exports = {
  getArgumentFlags() {
    return process.argv.slice(2)
  },

  envGet(key, defaultValue) {
    const value = process.env[key]
    return typeof value === 'undefined' ? defaultValue : value
  },

  capitalize(text = '') {
    return text[0].toUpperCase() + text.slice(1)
  }
}
