const express = require('express');
const app = express();
const jwt = require('express-jwt');
const jwtAuthz = require('express-jwt-authz');
const jwksRsa = require('jwks-rsa');
const cors = require('cors');
const bodyParser = require('body-parser');
const request = require("request");

//API
const mediumAccountAPI = require('./api/api_medium');


require('dotenv').config();


app.use(cors());
// Enable the use of request body parsing middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

const checkJwt = jwt({
    // Dynamically provide a signing key based on the kid in the header and the singing keys provided by the JWKS endpoint.
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: "https://odayibasi.auth0.com/.well-known/jwks.json"
    }),

    // Validate the audience and the issuer.
    audience: 'https://api.yumod.com/storyman',
    issuer: 'https://odayibasi.auth0.com/',
    algorithms: ['RS256']
});


//===============================================================================
// MEDIUM CONNECT
//================================================================================
app.post('/api/mediumconnects/', checkJwt, jwtAuthz(['create:mediumconnects']), function(req, res) {
    mediumAccountAPI.checkAccountFindAllMediumPostCreateStoryModelAndSaveS3(req,res);
});



//===============================================================================
// SAMPLE API For Private And Public
//================================================================================
app.get('/api/public', function(req, res) {
    res.json({
        message: "Hello from a public endpoint! You don't need to be authenticated to see this."
    });
});


app.get('/api/private', checkJwt, jwtAuthz(['write:storyman']), function(req, res) {
    // Associate the timesheet entry with the current user
    var userId = req.user['https://api.yumod.com/email'];
    console.log(userId);
    res.json({
        message: 'Hello from a private endpoint! You need to be authenticated and have a scope of read:messages to see this.' + userId
    });
});




var port = process.env.PORT || 3010
app.listen(port);
console.log('Listening on http://localhost:3010');