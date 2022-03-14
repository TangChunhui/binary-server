'use strict'

require('../models/component')

const dir = require('../utils/dir')
const path = require('path')
const fs = require('fs')
const fsp = require('fs-promise')
const os = require('os')
const util = require('util')
const koaBody = require('koa-body')

// /usr/local/var/mongodb
const mongoose = require('mongoose'),
    Component = mongoose.model('Component')


async function show(ctx) {
    const branch = ctx.params.branch
    const reponame = ctx.params.reponame
    const filename = ctx.params.filename
    let conditions = {}

    if (branch && reponame) {
        conditions = { branch: branch, reponame: reponame, filename: filename}
    }

    let branchs = ctx.params.branchs
    if (branchs) {
        branchs = branchs.split(',')
        conditions = { branch: { $in: branchs } }
    }

    const components = await Component.find(conditions).exec()

    let body = {}
    for (const i in components) {
        let branch = components[i].branch
        body[branch] = body[branch] || []
        body[branch].push(components[i].reponame)
        body[branch].push(components[i].filename)
    }

    ctx.body = body
}

async function create(ctx) {
    const branch = ctx.request.body.fields.branch
    const reponame = ctx.request.body.fields.reponame
    const filename = ctx.request.body.fields.filename

    const binaryDir = dir.binaryDir(branch, reponame)
    if (!fs.existsSync(binaryDir)) {
        await dir.mkdirp(binaryDir)
    }

    const file = ctx.request.body.files.file

    let component = await Component.where({ branch: branch, reponame: reponame }).findOne().exec()
        // let oldFiles = await fsp.readdir(binaryDir)
        // oldFiles = oldFiles.filter((branch) => { return branch == file.branch })
    // if (component) {
    //     ctx.body = util.format('二进制文件已经存在 %s (%s)', branch, reponame)
    //     return
    // }

    const filePath = path.join(binaryDir, file.name)
    const reader = fs.createReadStream(file.path)
    const writer = fs.createWriteStream(filePath)
    reader.pipe(writer)

    component = new Component
    component.branch = branch
    component.reponame = reponame
    component.filename = filename

    try {
        await component.save()
    } catch (error) {
        console.log(error)
        ctx.body = error.message
        return
    }

    ctx.body = util.format('保存成功 %s (%s)', branch, reponame)
}

async function destroy(ctx) {
    const branch = ctx.params.branch
    const reponame = ctx.params.reponame
    const filename = ctx.request.body.fields.filename

    const component = await Component.where({ branch: branch, reponame: reponame , filename: filename}).findOne().exec()
    if (!component) {
        ctx.status = 404
        ctx.body = util.format('无二进制文件 %s (%s)', branch, reponame)
        return
    }

    const binaryDir = path.join(dir.binaryRoot(), branch)
    const binaryDir1 = binaryDir.join(reponame, filename)
    if (fs.existsSync(binaryDir)) {
        await dir.rmdir(binaryDir)
    }

    try {
        await Component.remove({ branch: branch, reponame: reponame, filename: filename })
    } catch (error) {
        console.log(error)
        ctx.body = error.message
        return
    }

    ctx.body = util.format('删除成功 %s (%s)', branch, reponame)
}

async function download(ctx) {
    const branch = ctx.params.branch
    const reponame = ctx.params.reponame
    const filename = ctx.params.filename

    const component = await Component.where({ branch: branch, reponame: reponame, filename: filename }).findOne().exec()

    if (!component) {
        ctx.status = 404
        ctx.body = util.format('无二进制文件 %s (%s)', branch, reponame)
        return
    }

    const binaryDir = dir.binaryDir(branch, reponame)
    // const binaryFiles = await fsp.readdir(binaryDir)
    // const binaryFile = binaryFiles.shift()
    // if (!binaryFile) {
    //     ctx.status = 404
    //     ctx.body = util.format('无二进制文件 %s (%s)', branch, reponame)
    //     return
    // }

    const binaryPath = path.join(binaryDir, filename)
    // ctx.type = path.extbranch(binaryPath)
    ctx.body = fs.createReadStream(binaryPath)
}

module.exports = {
    show,
    create,
    destroy,
    download
}