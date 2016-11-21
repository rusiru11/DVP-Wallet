/**
 * Created by Rajinda on 10/1/2015.
 */

var messageFormatter = require('dvp-common/CommonMessageGenerator/ClientMessageJsonFormatter.js');
var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
var DbConn = require('dvp-dbmodels');
var moment = require('moment');
var Sequelize = require('sequelize');


/*-------------- Channel Master Data --------------------*/
module.exports.CreateCustomer = function (req, customer, callback) {
    DbConn.SubscribeCustomer
        .create(
        {
            created: customer.created,
            cusid: customer.cusid,
            email: customer.email,
            subscriptions: customer.subscriptions,
            TenantId: req.user.tenant,
            CompanyId: req.user.company,
        }
    ).then(function (cmp) {
            callback.end(undefined, cmp);
        }).error(function (err) {
            callback.end(err, undefined);
        });
};

module.exports.UpdateCustomerSubscription = function (req, customer,subscription, callback) {
    DbConn.SubscribeCustomer
        .update(
        {
            subscriptions: subscription
        }
        ,
        {
            where: [{cusid: customer.customer}, {TenantId: req.user.tenant}, {CompanyId: req.user.company}]
        }
    ).then(function (cmp) {
            callback.end(undefined, cmp);
        }).error(function (err) {
            callback.end(err, undefined);
        });
};
