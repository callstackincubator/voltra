const { createMetroConfig } = require('./metro/createMetroConfig')

module.exports = async function metroConfig() {
  return createMetroConfig(__dirname)
}
