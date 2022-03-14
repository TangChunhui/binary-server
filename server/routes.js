const frameworks = require('./controllers/frameworks')
const Router = require('koa-router')
const router = new Router

router
    .get('/frameworks', frameworks.show)
    .get('/frameworks/:branchs', frameworks.show)
    .get('/frameworks/:branch/:reponame', frameworks.show)
    .del('/frameworks/:branch/:reponame/:filename', frameworks.destroy)
    .get('/frameworks/:branch/:reponame/:filename', frameworks.download)
    .post('/frameworks', frameworks.create)

module.exports = router