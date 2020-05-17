/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const express               = require('express');
// const bodyParser            = require('body-parser');
// const jsonBodyParser        = bodyParser.json({limit: config.api.payloadSize, extended: true});

const app = express();

// app.use(cookieParser());
app.use(express.static('public'));


const cwd = process.cwd();
app.get('*', function (req, res) {
    res.sendFile(`${cwd}/public/index.html`)
})


const port = 5678
app.set('port', port);


app.listen(port, () => {
    console.log('Listening on port ' + port);
});