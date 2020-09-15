const { request, response } = require("express")

const req = require('request')

module.exports = function(obj) {
    return new Promise((resolve, reject) => {
        req(obj, (error, response, body) => {
            if(!error) {
                resolve(body)
            } else {
                reject(error) 
            }
        })
    })
}