/**
 * Created by Rajinda on 11/15/2016.
 */

var messageFormatter = require('dvp-common/CommonMessageGenerator/ClientMessageJsonFormatter.js');
var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
var DbConn = require('dvp-dbmodels');
var moment = require('moment');
var Sequelize = require('sequelize');
var redis = require('redis');

var config = require('config');
var directPayment = require('../Stripe/DirectPayment');

var client = redis.createClient(config.Redis.port, config.Redis.ip);
client.auth(config.Redis.password);
client.select(config.Redis.redisdb, redis.print);
//client.select(config.Redis.redisdb, function () { /* ... */ });
client.on("error", function (err) {
    logger.error('error', 'Redis connection error :: %s', err);
    console.log("Error " + err);
});

client.on("connect", function (err) {
    client.select(config.Redis.redisdb, redis.print);
});
var lock = require("redis-lock")(client);


module.exports.CreatePackage = function (req, res) {

    directPayment.DirectPayment(req.body).then(function (customer) {
        DbConn.Wallet
            .create(
            {
                Owner: req.user.iss,
                StripeId: customer.id,
                Description: req.body.Description,
                Tag: req.body.Tag,
                CurrencyISO: req.body.CurrencyISO,
                Credit: req.body.Credit,
                Status: true,
                TenantId: req.user.tenant,
                CompanyId: req.user.company
            }
        ).then(function (cmp) {
                var jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", true, cmp);
                logger.info('CreatePackage - Create Wallet - [%s] .', jsonString);
                req.body.WalletId = cmp.WalletId;
                this.BuyCredit(req, res);
                var data = {
                    StripeId: customer.id,
                    Description: req.body.Description,
                    CurrencyISO: req.body.CurrencyISO,
                    Credit: 0,
                    Tag: req.body.Tag,
                    TenantId: req.user.tenant,
                    CompanyId: req.user.company,
                    OtherJsonData: {"msg": "Create New Wallet","invokeBy": req.user.iss},
                    WalletId: cmp.WalletId
                };
                addHistory(data);
            }).error(function (err) {
                var jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
                logger.error('CreatePackage - Fail To Create Wallet. - [%s] .', jsonString);
                res.end(jsonString);
            });

    }, function (err) {
        var jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
        logger.error('CreatePackage-DirectPayment - Fail To Create Wallet. - [%s] .', jsonString);
        res.end(jsonString);
    });

};

module.exports.CreateWallet = function (req, res) {

    directPayment.CustomerRegister(req.body).then(function (customer) {

        DbConn.Wallet
            .create(
            {
                Owner: req.user.iss,
                StripeId: customer.id,
                Description: req.body.Description,
                Tag: req.body.Tag,
                CurrencyISO: req.body.CurrencyISO,
                Credit: 0,
                Status: true,
                TenantId: req.user.tenant,
                CompanyId: req.user.company
            }
        ).then(function (cmp) {
                var jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", true, cmp);
                logger.info('CreateWallet - Create Wallet - [%s] .', jsonString);
                res.end(jsonString);
                var data = {
                    StripeId: customer.id,
                    Description: req.body.Description,
                    CurrencyISO: req.body.CurrencyISO,
                    Credit: 0,
                    Tag: req.body.Tag,
                    TenantId: req.user.tenant,
                    CompanyId: req.user.company,
                    OtherJsonData: {"msg": "Create New Wallet","invokeBy": req.user.iss},
                    WalletId: cmp.WalletId
                };
                addHistory(data);
            }).error(function (err) {
                var jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
                logger.error('CreateWallet - Fail To Create Wallet. - [%s] .', jsonString);
                res.end(jsonString);
            });

    }, function (err) {
        var jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
        logger.error('CreateWallet-DirectPayment - Fail To Create Wallet. - [%s] .', jsonString);
        res.end(jsonString);
    });
};

module.exports.UpdateWallet = function (req, res) {

    DbConn.Wallet
        .update(
        {
            Description: req.body.Description,
            Tag: req.body.Tag
        },
        {
            where: [{WalletId: req.params.WalletId}, {Owner: req.user.iss}, {TenantId: req.user.tenant}, {CompanyId: req.user.company}, {Status: true}]
        }
    ).then(function (cmp) {
            var jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", true, cmp);
            logger.info('UpdateWallet - Update Wallet - [%s] .', jsonString);
            res.end(jsonString);
            var data = {
                StripeId: "",
                Description: req.body.Description,
                CurrencyISO: "",
                Credit: 0,
                Tag: req.body.Tag,
                TenantId: req.user.tenant,
                CompanyId: req.user.company,
                OtherJsonData: {"msg": "UpdateWallet","invokeBy": req.user.iss},
                WalletId: cmp.WalletId
            };
            addHistory(data);
        }).error(function (err) {
            var jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            logger.error('UpdateWallet - Fail To Update Wallet. - [%s] .', jsonString);
            res.end(jsonString);
        });
};

module.exports.BuyCredit = function (req, res) {
    var walletId = req.params.WalletId;
    if (walletId) {
        lock(walletId, function (done) {
            console.log("Lock acquired" + walletId);
            // No one else will be able to get a lock on 'myLock' until you call done()  done();

            DbConn.Wallet.find({
                where: [{WalletId: walletId}, {Owner: req.user.iss}, {TenantId: req.user.tenant}, {CompanyId: req.user.company}, {Status: true}]
            }).then(function (wallet) {
                if (wallet) {
                    var amount = parseFloat(req.body.Amount);
                    // buy credit form strip
                    directPayment.BuyCredit(wallet, amount).then(function (charge) {
                        var credit = parseFloat(wallet.Credit) + amount;
                        DbConn.Wallet
                            .update(
                            {
                                Credit: credit
                            },
                            {
                                where: [{WalletId: wallet.WalletId}]
                            }
                        ).then(function (cmp) {
                                var jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", true, cmp);
                                logger.info('BuyCredit - Update Wallet - [%s] .', jsonString);
                                done();
                                res.end(jsonString);
                                var data = {
                                    StripeId: undefined,
                                    Description: undefined,
                                    CurrencyISO: undefined,
                                    Credit: credit,
                                    Tag: undefined,
                                    TenantId: req.user.tenant,
                                    CompanyId: req.user.company,
                                    OtherJsonData: {"msg": "BuyCredit","invokeBy": req.user.iss},
                                    WalletId: cmp.WalletId
                                };
                                addHistory(data);
                            }).error(function (err) {
                                var jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
                                logger.error('BuyCredit - Fail To Update Wallet. - [%s] .', jsonString);
                                done();
                                res.end(jsonString);
                            });

                    }, function (error) {
                        var jsonString = messageFormatter.FormatMessage(error, "EXCEPTION", false, undefined);
                        logger.error('BuyCredit - Fail To Update Wallet. - [%s] .', jsonString);
                        done();
                        res.end(jsonString);
                    });
                }
                else {
                    var jsonString = messageFormatter.FormatMessage(new Error("Invalid Wallet ID"), "EXCEPTION", false, undefined);
                    logger.error('[BuyCredit] - [%s] ', jsonString);
                    done();
                    res.end(jsonString);
                }
            }).error(function (err) {
                var jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
                logger.error('[BuyCredit] - [%s] ', jsonString);
                done();
                res.end(jsonString);
            });
        });

    }
    else {
        var jsonString = messageFormatter.FormatMessage(new Error("No Wallet ID"), "EXCEPTION", false, undefined);
        logger.error('[BuyCredit] - [%s] ', jsonString);
        res.end(jsonString);
    }
};

module.exports.BuyCreditFormSelectedCard = function (req, res) {
    if (req.params.WalletId) {
        lock(req.params.WalletId, function (done) {
            console.log("Lock acquired" + req.params.WalletId);
            // No one else will be able to get a lock on 'myLock' until you call done()  done();

            DbConn.Wallet.find({
                where: [{WalletId: req.params.WalletId}, {Owner: req.user.iss}, {TenantId: req.user.tenant}, {CompanyId: req.user.company}, {Status: true}]
            }).then(function (wallet) {
                if (wallet) {
                    var amount = parseFloat(req.body.Amount);
                    var walData = {
                        CurrencyISO: wallet.CurrencyISO,
                        StripeId: req.params.cardId
                    };

                    directPayment.BuyCredit(walData, amount).then(function (charge) {

                        DbConn.Wallet
                            .update(
                            {
                                Credit: wallet.Credit + amount
                            },
                            {
                                where: [{WalletId: wallet.WalletId}]
                            }
                        ).then(function (cmp) {
                                var jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", true, cmp);
                                logger.info('BuyCredit - Update Wallet - [%s] .', jsonString);
                                done();
                                res.end(jsonString);
                                var data = {
                                    StripeId: undefined,
                                    Description: undefined,
                                    CurrencyISO: undefined,
                                    Credit: cmp.Credit,
                                    Tag: undefined,
                                    TenantId: req.user.tenant,
                                    CompanyId: req.user.company,
                                    OtherJsonData: {"msg": "BuyCredit","invokeBy": req.user.iss},
                                    WalletId: cmp.WalletId
                                };
                                addHistory(data);
                            }).error(function (err) {
                                var jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
                                logger.error('BuyCredit - Fail To Update Wallet. - [%s] .', jsonString);
                                done();
                                res.end(jsonString);
                            });

                    }, function (error) {
                        var jsonString = messageFormatter.FormatMessage(error, "EXCEPTION", false, undefined);
                        logger.error('BuyCredit - Fail To Update Wallet. - [%s] .', jsonString);
                        done();
                        res.end(jsonString);
                    });
                }
                else {
                    var jsonString = messageFormatter.FormatMessage(new Error("Invalid Wallet ID"), "EXCEPTION", false, undefined);
                    logger.error('[BuyCredit] - [%s] ', jsonString);
                    done();
                    res.end(jsonString);
                }
            }).error(function (err) {
                var jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
                logger.error('[BuyCredit] - [%s] ', jsonString);
                done();
                res.end(jsonString);
            });
        });

    }
    else {
        var jsonString = messageFormatter.FormatMessage(new Error("No Wallet ID"), "EXCEPTION", false, undefined);
        logger.error('[BuyCredit] - [%s] ', jsonString);
        res.end(jsonString);
    }
};

module.exports.DeductCredit = function (req, res) {

    lock(req.params.WalletId, function (done) {
        console.log("Lock acquired" + req.params.WalletId);
        // No one else will be able to get a lock on 'myLock' until you call done()  done();
        DbConn.Wallet.find({
            where: [{WalletId: req.params.WalletId}, {TenantId: req.user.tenant}, {CompanyId: req.user.company}, {Status: true}]
        }).then(function (wallet) {
            if (wallet) {
                var amount = parseFloat(req.body.Amount);
                var credit = parseFloat(wallet.Credit);
                if (credit > amount) {
                    credit = credit - amount;
                    DbConn.Wallet
                        .update(
                        {
                            Credit: credit
                        },
                        {
                            where: [{WalletId: wallet.WalletId}]
                        }
                    ).then(function (cmp) {
                            var jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", true, cmp);
                            logger.info('DeductCredit - Update Wallet - [%s] .', jsonString);
                            done();
                            res.end(jsonString);
                            var data = {
                                StripeId: undefined,
                                Description: undefined,
                                CurrencyISO: undefined,
                                Credit: credit,
                                Tag: undefined,
                                TenantId: req.user.tenant,
                                CompanyId: req.user.company,
                                OtherJsonData: {"msg": "DeductCredit", "amount": amount,"invokeBy": req.user.iss},
                                WalletId: cmp.WalletId
                            };
                            addHistory(data);
                        }).error(function (err) {
                            var jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
                            logger.error('DeductCredit - Fail To Update Wallet. - [%s] .', jsonString);
                            done();
                            res.end(jsonString);
                        });
                }
                else {
                    var jsonString = messageFormatter.FormatMessage(new Error("Insufficient  Credit Balance."), "EXCEPTION", false, undefined);
                    logger.error('[DeductCredit] - [%s] ', jsonString);
                    done();
                    res.end(jsonString);
                }
            }
            else {
                var jsonString = messageFormatter.FormatMessage(new Error("Invalid Wallet ID"), "EXCEPTION", false, undefined);
                logger.error('[DeductCredit] - [%s] ', jsonString);
                done();
                res.end(jsonString);
            }
        }).error(function (err) {
            var jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            logger.error('[DeductCredit] - [%s] ', jsonString);
            done();
            res.end(jsonString);
        });
    });

};

module.exports.DeductCreditFormCustomer = function (req, res) {

    lock(req.params.CustomerId, function (done) {
        console.log("Lock acquired" + req.params.WalletId);
        // No one else will be able to get a lock on 'myLock' until you call done()  done();
        DbConn.Wallet.find({
            where: [{Owner: req.params.CustomerId}, {TenantId: req.user.tenant}, {CompanyId: req.user.company}, {Status: true}]
        }).then(function (wallet) {
            if (wallet) {
                var amount = parseFloat(req.body.Amount);
                var credit = parseFloat(wallet.Credit);
                if (credit > amount) {
                    credit = credit - amount;
                    DbConn.Wallet
                        .update(
                        {
                            Credit: credit
                        },
                        {
                            where: [{WalletId: wallet.WalletId}]
                        }
                    ).then(function (cmp) {
                            var jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", true, cmp);
                            logger.info('DeductCreditFormCustomer - Update Wallet - [%s] .', jsonString);
                            done();
                            res.end(jsonString);
                            var data = {
                                StripeId: undefined,
                                Description: undefined,
                                CurrencyISO: undefined,
                                Credit: credit,
                                Tag: undefined,
                                TenantId: req.user.tenant,
                                CompanyId: req.user.company,
                                OtherJsonData: {"msg": "DeductCredit", "amount": amount,"invokeBy": req.user.iss},
                                WalletId: cmp.WalletId
                            };
                            addHistory(data);
                        }).error(function (err) {
                            var jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
                            logger.error('DeductCreditFormCustomer - Fail To Update Wallet. - [%s] .', jsonString);
                            done();
                            res.end(jsonString);
                        });
                }
                else {
                    var jsonString = messageFormatter.FormatMessage(new Error("Insufficient  Credit Balance."), "EXCEPTION", false, undefined);
                    logger.error('[DeductCreditFormCustomer] - [%s] ', jsonString);
                    done();
                    res.end(jsonString);
                }
            }
            else {
                var jsonString = messageFormatter.FormatMessage(new Error("Invalid Wallet ID"), "EXCEPTION", false, undefined);
                logger.error('[DeductCreditFormCustomer] - [%s] ', jsonString);
                done();
                res.end(jsonString);
            }
        }).error(function (err) {
            var jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            logger.error('[DeductCreditFormCustomer] - [%s] ', jsonString);
            done();
            res.end(jsonString);
        });
    });

};

module.exports.CreditBalance = function (req, res) {

    DbConn.Wallet.find({
        where: [{Owner: req.user.iss}, {TenantId: req.user.tenant}, {CompanyId: req.user.company}, {Status: true}]
    }).then(function (wallet) {
        var jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", true, 0);
        if (wallet) {
            jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", true, wallet.Credit);
        }
        else {
            jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", false, 0);
        }
        logger.info('CreditBalance -  Wallet - [%s] .', jsonString);
        res.end(jsonString);
    }).error(function (err) {
        var jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
        logger.error('[CreditBalance] - [%s] ', jsonString);
        res.end(jsonString);
    });
};

module.exports.CreditBalanceById = function (req, res) {

    DbConn.Wallet.find({
        where: [{WalletId: req.params.WalletId}, {TenantId: req.user.tenant}, {CompanyId: req.user.company}, {Status: true}]
    }).then(function (wallet) {
        var jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", true, 0);
        if (wallet) {
            jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", true, wallet.Credit);
        }
        else {
            jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", false, 0);
        }
        logger.info('CreditBalance -  Wallet - [%s] .', jsonString);
        res.end(jsonString);
    }).error(function (err) {
        var jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
        logger.error('[CreditBalance] - [%s] ', jsonString);
        res.end(jsonString);
    });
};

module.exports.AddNewCard = function (req, res) {

    DbConn.Wallet.find({
        where: [{WalletId: req.params.WalletId}, {Owner: req.user.iss}, {TenantId: req.user.tenant}, {CompanyId: req.user.company}, {Status: true}]
    }).then(function (wallet) {
        if (wallet) {
            directPayment.AddNewCard(wallet.StripeId, req.body.token).then(function (customer) {

                var data = {
                    StripeId: wallet.StripeId,
                    Description: req.body.Description,
                    CurrencyISO: undefined,
                    Credit: 0,
                    Tag: undefined,
                    TenantId: req.user.tenant,
                    CompanyId: req.user.company,
                    OtherJsonData: {"msg": "AddNewCard", "Data": JSON.parse(customer),"invokeBy": req.user.iss},
                    WalletId: wallet.WalletId
                };
                addHistory(data);

            }, function (err) {
                var jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
                logger.error('CreatePackage-DirectPayment - Fail To Create Wallet. - [%s] .', jsonString);
                res.end(jsonString);
            });
        }
        else {
            var jsonString = messageFormatter.FormatMessage(undefined, "Invalid Wallet ID", false, undefined);
            logger.error('[AddNewCard] - [%s] ', jsonString);
            res.end(jsonString);
        }
    }).error(function (err) {
        var jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
        logger.error('[AddNewCard] - [%s] ', jsonString);
        res.end(jsonString);
    });
};

module.exports.RemoveCard = function (req, res) {

    DbConn.Wallet.find({
        where: [{WalletId: req.params.WalletId}, {Owner: req.user.iss}, {TenantId: req.user.tenant}, {CompanyId: req.user.company}, {Status: true}]
    }).then(function (wallet) {
        if (wallet) {
            directPayment.DeleteCard(wallet.StripeId, req.params.CardId).then(function (customer) {
                if (JSON.parse(customer).deleted) {
                    var jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", true, customer);
                    logger.info('RemoveCard - Update Wallet - [%s] .', jsonString);
                    res.end(jsonString);
                    var data = {
                        StripeId: wallet.StripeId,
                        Description: undefined,
                        CurrencyISO: undefined,
                        Credit: 0,
                        Tag: undefined,
                        TenantId: req.user.tenant,
                        CompanyId: req.user.company,
                        OtherJsonData: {"msg": "RemoveCard", "Data": JSON.parse(customer),"invokeBy": req.user.iss},
                        WalletId: wallet.WalletId
                    };
                    addHistory(data);
                }
                else {
                    var jsonString = messageFormatter.FormatMessage(undefined, "Fail To Remove Card form Wallet", false, undefined);
                    logger.error('RemoveCard-DirectPayment - Fail To Remove Card form Wallet. - [%s] .', jsonString);
                    res.end(jsonString);
                }
            }, function (err) {
                var jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
                logger.error('RemoveCard-DirectPayment - Fail To Remove Card form  Wallet. - [%s] .', jsonString);
                res.end(jsonString);
            });
        }
        else {
            var jsonString = messageFormatter.FormatMessage(undefined, "Invalid Wallet ID", false, undefined);
            logger.error('[RemoveCard] - [%s] ', jsonString);
            res.end(jsonString);
        }
    }).error(function (err) {
        var jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
        logger.error('[RemoveCard] - [%s] ', jsonString);
        res.end(jsonString);
    });
};

module.exports.ListCards = function (req, res) {

    DbConn.Wallet.find({
        where: [{WalletId: req.params.WalletId}, {Owner: req.user.iss}, {TenantId: req.user.tenant}, {CompanyId: req.user.company}, {Status: true}]
    }).then(function (wallet) {
        if (wallet) {
            directPayment.ListCards(wallet.StripeId).then(function (cards) {

                var cardDetails = cards.data.map(function (item) {
                    var obj = {
                        id: item.id,
                        name: item.name
                    };
                    return obj
                });

                var jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", true, cardDetails);
                logger.info('ListCards - Get Card Details. - [%s] .', jsonString);
                res.end(jsonString);
            }, function (err) {
                var jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
                logger.error('ListCards - Fail To Get Card Details.. - [%s] .', jsonString);
                res.end(jsonString);
            });
        }
        else {
            var jsonString = messageFormatter.FormatMessage(undefined, "Invalid Wallet ID", false, undefined);
            logger.error('[RemoveCard] - [%s] ', jsonString);
            res.end(jsonString);
        }
    }).error(function (err) {
        var jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
        logger.error('[RemoveCard] - [%s] ', jsonString);
        res.end(jsonString);
    });
};

module.exports.SetDefaultCard = function (req, res) {

    DbConn.Wallet.find({
        where: [{WalletId: req.params.WalletId}, {Owner: req.user.iss}, {TenantId: req.user.tenant}, {CompanyId: req.user.company}, {Status: true}]
    }).then(function (wallet) {
        if (wallet) {

            directPayment.SetDefaultCard(wallet.StripeId,req.params.CardId).then(function (cards) {
                var jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", true, cards);
                logger.info('SetDefaultCard - . - [%s] .', jsonString);
                res.end(jsonString);

                var data = {
                    StripeId: wallet.StripeId,
                    Description: undefined,
                    CurrencyISO: undefined,
                    Credit: 0,
                    Tag: undefined,
                    TenantId: req.user.tenant,
                    CompanyId: req.user.company,
                    OtherJsonData: {"msg": "SetDefaultCard", "Data": JSON.parse(cards),"invokeBy": req.user.iss},
                    WalletId: wallet.WalletId
                };
                addHistory(data);

            }, function (err) {
                var jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
                logger.error('SetDefaultCard - Fail Set Default Card. - [%s] .', jsonString);
                res.end(jsonString);
            });

        }
        else {
            var jsonString = messageFormatter.FormatMessage(undefined, "Invalid Wallet ID", false, undefined);
            logger.error('[SetDefaultCard] - [%s] ', jsonString);
            res.end(jsonString);
        }
    }).error(function (err) {
        var jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
        logger.error('[SetDefaultCard] - [%s] ', jsonString);
        res.end(jsonString);
    });
};

var addHistory = function (data) {

    DbConn.WalletHistory
        .create(
        {
            StripeId: data.customerId,
            Description: data.Description,
            CurrencyISO: data.CurrencyISO,
            Credit: data.Credit,
            TenantId: data.TenantId,
            CompanyId: data.CompanyId,
            OtherJsonData: data.OtherJsonData,
            WalletId: data.WalletId
        }
    ).then(function (cmp) {
            var jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", true, cmp);
            logger.info('addHistory - Create WalletHistory - [%s] .', jsonString);
        }).error(function (err) {
            var jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            logger.error('addHistory - Fail To Create WalletHistory. - [%s] .', jsonString);
        });

};