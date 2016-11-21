/**
 * Created by Rajinda on 8/24/2015.
 */

var restify = require('restify');

var config = require('config');
var port = config.Host.port || 3000;
var version = config.Host.version;

var logger = require('DVP-Common/LogHandler/CommonLogHandler.js').logger;
var messageFormatter = require('DVP-Common/CommonMessageGenerator/ClientMessageJsonFormatter.js');
var subscriptionsHandler = require('./Stripe/SubscriptionsHandler');
var walletHandler = require('./Wallet/WalletHandler');
var webhookHandler = require('./Stripe/WebhookHandler');
var directPayment = require('./Stripe/DirectPayment');

//-------------------------  Restify Server ------------------------- \\

var jwt = require('restify-jwt');
var secret = require('dvp-common/Authentication/Secret.js');
var authorization = require('dvp-common/Authentication/Authorization.js');

var RestServer = restify.createServer({
    name: 'WalletServer',
    version: '1.0.0'
});

restify.CORS.ALLOW_HEADERS.push('authorization');
restify.CORS.ALLOW_HEADERS.push('api_key');
RestServer.use(restify.CORS());
RestServer.use(restify.fullResponse());
RestServer.use(restify.acceptParser(RestServer.acceptable));
RestServer.use(restify.queryParser());
RestServer.use(restify.bodyParser());
RestServer.use(jwt({secret: secret.Secret}));



RestServer.post('/DVP/API/' + version + '/PaymentManager/Wallet/Package', authorization({
    resource: "ardsresource",
    action: "read"
}), function (req, res, next) {
    try {
        logger.info('[CreateWallet] - [HTTP]  - Request received -  Data - %s ', JSON.stringify(req.body));
        walletHandler.CreatePackage(req, res);
    }
    catch (ex) {
        logger.error('[CreateWallet] - [HTTP]  - Exception occurred -  Data - %s ', JSON.stringify(req.body), ex);
        var jsonString = messageFormatter.FormatMessage(ex, "EXCEPTION", false, undefined);
        res.end(jsonString);
    }
    return next();
});

RestServer.post('/DVP/API/' + version + '/PaymentManager/Wallet', authorization({
    resource: "ardsresource",
    action: "read"
}), function (req, res, next) {
    try {
        logger.info('[CreateWallet] - [HTTP]  - Request received -  Data - %s ', JSON.stringify(req.body));
        walletHandler.CreateWallet(req, res);
    }
    catch (ex) {
        logger.error('[CreateWallet] - [HTTP]  - Exception occurred -  Data - %s ', JSON.stringify(req.body), ex);
        var jsonString = messageFormatter.FormatMessage(ex, "EXCEPTION", false, undefined);
        res.end(jsonString);
    }
    return next();
});

RestServer.put('/DVP/API/' + version + '/PaymentManager/Wallet/:WalletId', authorization({
    resource: "ardsresource",
    action: "read"
}), function (req, res, next) {
    try {
        logger.info('[UpdateWallet] - [HTTP]  - Request received -  Data - %s ', JSON.stringify(req.body));
        walletHandler.UpdateWallet(req, res);
    }
    catch (ex) {
        logger.error('[UpdateWallet] - [HTTP]  - Exception occurred -  Data - %s ', JSON.stringify(req.body), ex);
        var jsonString = messageFormatter.FormatMessage(ex, "EXCEPTION", false, undefined);
        res.end(jsonString);
    }
    return next();
});

RestServer.get('/DVP/API/' + version + '/PaymentManager/Wallet', authorization({
    resource: "ardsresource",
    action: "read"
}), function (req, res, next) {
    try {
        logger.info('[CreditBalance] - [HTTP]  - Request received -  Data - %s ', JSON.stringify(req.body));
        walletHandler.CreditBalance(req, res);
    }
    catch (ex) {
        logger.error('[CreditBalance] - [HTTP]  - Exception occurred -  Data - %s ', JSON.stringify(req.body), ex);
        var jsonString = messageFormatter.FormatMessage(ex, "EXCEPTION", false, undefined);
        res.end(jsonString);
    }
    return next();
});

RestServer.get('/DVP/API/' + version + '/PaymentManager/Wallet/:WalletId', authorization({
    resource: "ardsresource",
    action: "read"
}), function (req, res, next) {
    try {
        logger.info('[CreditBalanceById] - [HTTP]  - Request received -  Data - %s ', JSON.stringify(req.body));
        walletHandler.CreditBalanceById(req, res);
    }
    catch (ex) {
        logger.error('[CreditBalanceById] - [HTTP]  - Exception occurred -  Data - %s ', JSON.stringify(req.body), ex);
        var jsonString = messageFormatter.FormatMessage(ex, "EXCEPTION", false, undefined);
        res.end(jsonString);
    }
    return next();
});

RestServer.get('/DVP/API/' + version + '/PaymentManager/Wallet/:WalletId/Cards', authorization({
    resource: "ardsresource",
    action: "read"
}), function (req, res, next) {
    try {
        logger.info('[ListCards] - [HTTP]  - Request received -  Data - %s ', JSON.stringify(req.body));
        walletHandler.ListCards(req, res);
    }
    catch (ex) {
        logger.error('[ListCards] - [HTTP]  - Exception occurred -  Data - %s ', JSON.stringify(req.body), ex);
        var jsonString = messageFormatter.FormatMessage(ex, "EXCEPTION", false, undefined);
        res.end(jsonString);
    }
    return next();
});

RestServer.post('/DVP/API/' + version + '/PaymentManager/Wallet/:WalletId/Credit', authorization({
    resource: "ardsresource",
    action: "read"
}), function (req, res, next) {
    try {
        logger.info('[BuyCredit] - [HTTP]  - Request received -  Data - %s ', JSON.stringify(req.body));
        walletHandler.BuyCredit(req, res);
    }
    catch (ex) {
        logger.error('[BuyCredit] - [HTTP]  - Exception occurred -  Data - %s ', JSON.stringify(req.body), ex);
        var jsonString = messageFormatter.FormatMessage(ex, "EXCEPTION", false, undefined);
        res.end(jsonString);
    }
    return next();
});

RestServer.post('/DVP/API/' + version + '/PaymentManager/Wallet/:WalletId/Credit/:cardId', authorization({
    resource: "ardsresource",
    action: "read"
}), function (req, res, next) {
    try {
        logger.info('[BuyCreditFormSelectedCard] - [HTTP]  - Request received -  Data - %s ', JSON.stringify(req.body));
        walletHandler.BuyCreditFormSelectedCard(req, res);
    }
    catch (ex) {
        logger.error('[BuyCreditFormSelectedCard] - [HTTP]  - Exception occurred -  Data - %s ', JSON.stringify(req.body), ex);
        var jsonString = messageFormatter.FormatMessage(ex, "EXCEPTION", false, undefined);
        res.end(jsonString);
    }
    return next();
});

RestServer.put('/DVP/API/' + version + '/PaymentManager/Wallet/:WalletId/Credit', authorization({
    resource: "ardsresource",
    action: "read"
}), function (req, res, next) {
    try {
        logger.info('[DeductCredit] - [HTTP]  - Request received -  Data - %s ', JSON.stringify(req.body));
        walletHandler.DeductCredit(req, res);
    }
    catch (ex) {
        logger.error('[DeductCredit] - [HTTP]  - Exception occurred -  Data - %s ', JSON.stringify(req.body), ex);
        var jsonString = messageFormatter.FormatMessage(ex, "EXCEPTION", false, undefined);
        res.end(jsonString);
    }
    return next();
});

RestServer.put('/DVP/API/' + version + '/PaymentManager/Customer/Wallet/Credit', authorization({
    resource: "ardsresource",
    action: "read"
}), function (req, res, next) {
    try {
        logger.info('[DeductCreditFormCustommer] - [HTTP]  - Request received -  Data - %s ', JSON.stringify(req.body));
        walletHandler.DeductCreditFormCustomer(req, res);
    }
    catch (ex) {
        logger.error('[DeductCreditFormCustommer] - [HTTP]  - Exception occurred -  Data - %s ', JSON.stringify(req.body), ex);
        var jsonString = messageFormatter.FormatMessage(ex, "EXCEPTION", false, undefined);
        res.end(jsonString);
    }
    return next();
});

RestServer.put('/DVP/API/' + version + '/PaymentManager/Wallet/:WalletId/Card', authorization({
    resource: "ardsresource",
    action: "read"
}), function (req, res, next) {
    try {
        logger.info('[AddNewCard] - [HTTP]  - Request received -  Data - %s ', JSON.stringify(req.body));
        walletHandler.AddNewCard(req, res);
    }
    catch (ex) {
        logger.error('[AddNewCard] - [HTTP]  - Exception occurred -  Data - %s ', JSON.stringify(req.body), ex);
        var jsonString = messageFormatter.FormatMessage(ex, "EXCEPTION", false, undefined);
        res.end(jsonString);
    }
    return next();
});

RestServer.del('/DVP/API/' + version + '/PaymentManager/Wallet/:WalletId/Card/:CardId', authorization({
    resource: "ardsresource",
    action: "read"
}), function (req, res, next) {
    try {
        logger.info('[RemoveCard] - [HTTP]  - Request received -  Data - %s ', JSON.stringify(req.body));
        walletHandler.RemoveCard(req, res);
    }
    catch (ex) {
        logger.error('[RemoveCard] - [HTTP]  - Exception occurred -  Data - %s ', JSON.stringify(req.body), ex);
        var jsonString = messageFormatter.FormatMessage(ex, "EXCEPTION", false, undefined);
        res.end(jsonString);
    }
    return next();
});

RestServer.put('/DVP/API/' + version + '/PaymentManager/Wallet/:WalletId/Card/:CardId', authorization({
    resource: "ardsresource",
    action: "read"
}), function (req, res, next) {
    try {
        logger.info('[SetDefaultCard] - [HTTP]  - Request received -  Data - %s ', JSON.stringify(req.body));
        walletHandler.SetDefaultCard(req, res);
    }
    catch (ex) {
        logger.error('[SetDefaultCard] - [HTTP]  - Exception occurred -  Data - %s ', JSON.stringify(req.body), ex);
        var jsonString = messageFormatter.FormatMessage(ex, "EXCEPTION", false, undefined);
        res.end(jsonString);
    }
    return next();
});

// ---------------------- webhook -------------------------------- //
RestServer.post('/DVP/API/' + version + '/webhook', function (req, res, next) {
    try {
        logger.info('[Webhook] - [HTTP]  - Request received -  Data - %s ', JSON.stringify(req.body));
        webhookHandler.Webhook(req, res);
    }
    catch (ex) {
        logger.error('[Webhook] - [HTTP]  - Exception occurred -  Data - %s ', JSON.stringify(req.body), ex);
        res.send(200);
    }
    return next();
});

// ---------------------- webhook -------------------------------- //

var port = config.Host.port || 3000;
RestServer.listen(port, function () {
    console.log('%s listening at %s', RestServer.name, RestServer.url);
});