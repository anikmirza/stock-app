/* global __dirname:true */
var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var app = express();
var path = require('path');
var hostname = 'localhost';
var port = 3000;
var fs = require('fs');
var firebaseUrl = 'https://stock-app-101a8.firebaseio.com/';

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

String.prototype.replaceAll = function(str1, str2, ignore) {
    return this.replace(new RegExp(str1.replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g,"\\$&"),(ignore?"gi":"g")),(typeof(str2)==="string")?str2.replace(/\$/g,"$$$$"):str2);
};

app.get('/live-data', function(req, res) {
    res.sendFile(path.join(__dirname + '/live-data.html'));
});

app.get('/live-data/get-data', function(req, res) {
    //var dseUrl = 'https://www.dsebd.org/latest_share_price_all_by_ltp.php';
    //var dseUrl = 'http://dsebd.org/latest_share_price_all_by_ltp.php';
    var dseUrl = 'https://www.dsebd.org/latest_share_price_scroll_by_ltp.php';
    request(dseUrl, function(error, response, body) {
        if (error) {
            res.send('');
        } else {
            res.send(body);
        }
    });
});

app.post('/live-data/update-checked-companies', function(req, res) {
    var companies = req.body.companies;
    readJson('live-settings', function(err, data) {
        if (err) { throw err; }
        var settings = data ? data : {};
        
        companies.forEach(function(company) {
            var foundIndex = 0;
            var found = settings.companies.find(function(companyS, index) {
                var success = companyS.code === company.code;

                if (success) {
                    foundIndex = index;
                }
                return success;
            });
            if (found) {
                settings.companies[foundIndex].checked = company.checked;
            } else {
                settings.companies.push(company);
            }
        });
        saveJson('live-settings', settings, function(err) {
            if (err) {
              res.status(404).send('Data was not saved');
              return;
            }
            res.send('Data was saved');
        });
    });
});

app.post('/live-data/update-target-price', function(req, res) {
    var company = req.body.company;
    readJson('live-settings', function(err, data) {
        if (err) { throw err; }
        var settings = data ? data : {};

        var foundIndex = 0;
        var found = settings.companies.find(function(companyS, index) {
            var success = companyS.code === company.code;

            if (success) {
                foundIndex = index;
            }
            return success;
        });
        if (found) {
            if (null != company.buyRate && company.buyRate > 0) {
                settings.companies[foundIndex].buyRate = company.buyRate;
            }
            if (null != company.sellRate && company.sellRate > 0) {
                settings.companies[foundIndex].sellRate = company.sellRate;
            }
        } else {
            settings.companies.push(company);
        }
        saveJson('live-settings', settings, function(err) {
            if (err) {
              res.status(404).send('Data was not saved');
              return;
            }
            res.send('Data was saved');
        });
    });
});

app.post('/live-data/update-settings', function(req, res) {
    var settingsObj = req.body.settings;
    readJson('live-settings', function(err, data) {
        if (err) { throw err; }
        var settings = data ? data : {};
        
        settings.onlyShowChecked = settingsObj.onlyShowChecked;
        settings.onlyShowBuyable = settingsObj.onlyShowBuyable;
        settings.onlyShowSellable = settingsObj.onlyShowSellable;

        saveJson('live-settings', settings, function(err) {
            if (err) {
              res.status(404).send('Data was not saved');
              return;
            }
            res.send('Data was saved');
        });
    });
});

app.post('/live-data/save-last-data', function(req, res) {
    var companies = req.body.companies;
    if (0 == companies.length) {
        res.send('Data was saved');
        return;
    }
    saveJson('last-data', companies, function(err) {
        if (err) {
            res.status(404).send('Data was not saved');
            return;
        }
        res.send('Data was saved');
    });
});

app.get('/calculator', function(req, res) {
    res.sendFile(path.join(__dirname + '/calculator.html'));
});

app.get('/history', function(req, res) {
    readJson('user-settings', function(err, userData) {
        var user = userData.users.find(function(value) {
            return value.id === userData.currentUser;
        });
        var database = getDataSource(user.dataSource);

        fs.readFile(__dirname + '/history.html', function(e, data) {
            if (e) { throw e; }
            var html = data.toString().replaceAll('<?= database =?>', database);
            res.send(html);
        });
    });
});

app.get('/settings', function(req, res) {
    res.sendFile(path.join(__dirname + '/setting.html'));
});

app.post('/setting/save', function(req, res) {
    var settingsObj = req.body.settings;
    readJson('user-settings', function(err, data) {
        if (err) { throw err; }
        var settings = data ? data : {};
        
        settings.currentUser = settingsObj.user;

        saveJson('user-settings', settings, function(err) {
            if (err) {
              res.status(404).send('Data was not saved');
              return;
            }
            res.send('Data was saved');
        });
    });
});

app.get('/', function(req, res) {
    readJson('user-settings', function(err, userData) {
        var user = userData.users.find(function(value) {
            return value.id === userData.currentUser;
        });

        if ('abbu' != user.id) {
            toHome(res, user.dataSource);
        } else {
            request(firebaseUrl + 'version.json', function (error, response, currentVersion) {

                if (error) {
                    toHome(res, user.dataSource);
                    return;
                }
                var source = getDataSource(user.dataSource);
                readJson(source, function(err, data) {

                    if (parseInt(data.version) !== parseInt(currentVersion)) {
                        request(firebaseUrl + '.json', function (error, response, body) {
                            saveJson(source, JSON.parse(body), function(err) {
                                toHome(res, user.dataSource);
                            });
                        });
                    } else {
                        toHome(res, user.dataSource);
                    }
                });
            });
        }
    });
});

app.post('/place-order/buy', function(req, res) {
    var orderObj = req.body.order;
    readJson('user-settings', function(err, data) {
        if (err) { throw err; }
        var settings = data ? data : {};
        readJson('userData/' + settings.currentUser, function(err, data) {
            if (err) { throw err; }
            var userData = data ? data : {};
            userData.current[orderObj.code] = {
                Commition: parseFloat(orderObj.commition),
                Date: toDateFormat(Date()),
                Quantity: parseInt(orderObj.qty),
                Rate: parseFloat(orderObj.rate)
            };
            saveJson('userData/' + settings.currentUser, userData, function(err) {
                if (err) {
                  res.status(404).send('Data was not saved');
                  return;
                }
                res.send('Data was saved');
            });
        });
    });
});

app.post('/place-order/sell', function(req, res) {
    var orderObj = req.body.order;
    readJson('user-settings', function(err, data) {
        if (err) { throw err; }
        var settings = data ? data : {};
        readJson('userData/' + settings.currentUser, function(err, data) {
            if (err) { throw err; }
            var userData = data ? data : {};
            if (!userData.current.hasOwnProperty(orderObj.code)) {
                res.send('You dont own any shares of company: ' + orderObj.code);
                return;
            }
            var buyInfo = userData.current[orderObj.code];
            var maxId = userData.history.reduce(function(t, x) {
                return x.Id > t ? x.Id : t;
            }, 0);
            var subTotal = (parseFloat(buyInfo.Quantity) * parseFloat(orderObj.rate)).toFixed(2);
            var sellCommition = parseFloat((parseFloat(subTotal) * 0.005).toFixed(2));
            var sellHistory = {
                Id: maxId + 1,
                Name: orderObj.code,
                Quantity: buyInfo.Quantity,
                BuyDate: buyInfo.Date,
                SellDate: toDateFormat(Date()),
                BuyRate: buyInfo.Rate,
                SellRate: parseFloat(orderObj.rate),
                BuyCommition: buyInfo.Commition,
                SellCommition: sellCommition
            };
            userData.history.push(sellHistory);
            delete userData.current[orderObj.code];
            saveJson('userData/' + settings.currentUser, userData, function(err) {
                if (err) {
                  res.status(404).send('Data was not saved');
                  return;
                }
                res.send('Order Placed');
            });
        });
    });
});

app.listen(port, hostname);

function readJson(name, callback) {
    fs.readFile('./public/json/' + name + '.json', function (err, data) {
        if (err) {
            callback(err);
            return;
        }
        try {
            callback(null, JSON.parse(data));
        } catch(exception) {
            callback(exception);
        }
    });
}

function saveJson(name, data, callback)
{
    fs.writeFile('./public/json/' + name + '.json', JSON.stringify(data), callback);
}

function getDataSource(name)
{
    return 'userData/' + name;
}

function toHome(res, dataSource)
{
    var database = getDataSource(dataSource);

    fs.readFile(__dirname + '/home.html', function(e, data) {
        if (e) { throw e; }
        var html = data.toString().replaceAll('<?= database =?>', database);
        res.send(html);
    });
}

function toDateFormat(date)
{
    var today = new Date(date);
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    today.getFullYear()
    today.getDate()
    months[today.getMonth()]
    return today.getDate() + "-" + months[today.getMonth()] + "-" + today.getFullYear()
}