'use strict';
/**
 * Created by neo on 19/8/2016.
 */

import http from "http";
import https from "https";
import url from "url";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const cacheRoot = path.join(__dirname, 'cache');

function proxy(req, res, cb) {
    let options = url.parse(req.url);
    options.method = req.method;
    options.headers = req.headers;

    let module = options.protocol === 'https:' ? https : http;

    let proxyReq = module.request(options, (response) => {
        res.writeHead(response.statusCode, response.headers);
        response.pipe(res);

        cb && cb(response);
    });

    proxyReq.on('error', (err) => {
        res.write(err.toString(), 'utf8');
        res.end();
    });

    req.on('data', (chunk) => {
        proxyReq.write(chunk, 'binary');
    });

    req.on('end', () => {
        proxyReq.end();
    });
}

http.createServer((req, res) => {
    console.log(req.method, req.url);

    if (!/i\.tennis\.colopl\.jp.+\.unity3d/.test(req.url)) {
        return proxy(req, res);
    }

    let hash = crypto.createHash('md5');
    hash.update(req.url);
    let cachePath = path.join(cacheRoot, hash.digest('hex'));

    fs.access(cachePath, (err) => {
        if (err) {
            console.log('miss cache:', req.url);

            proxy(req, res, (response) => {
                let stream = fs.createWriteStream(cachePath, {
                    flag: 'w',
                    defaultEncoding: 'binary'
                });

                response.pipe(stream);
            });
        } else {
            console.log('hit cache:', req.url);

            let stream = fs.createReadStream(cachePath, {
                defaultEncoding: 'binary'
            });

            stream.pipe(res);
        }
    });
}).listen(9000);

console.log('listen on 9000');
