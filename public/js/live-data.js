"use strict";
/* global req:true */

var sortWith = { name: 'ltp', type: "desc" };
var companies = [];

var manageItemModal = {
    load: function() {
        var modal = this;
        this.render();
        window.onresize = function() {
            modal.render();
        };
    },
    render: function() {
        var marginTop = parseInt(window.innerHeight / 2);
        var objs = document.getElementsByClassName('manage-item-modal');
        [].forEach.call(objs, function (obj) {
            var box = obj.children[0].children[0].children[0];
            box.style.marginTop = marginTop + "px";
        });
    }
};

var page = {
    checkMode: false,
    settings: {},
    checkedCompanies: [],
    buyModalNoOfSharesTimeOut: null,
    topNotification: {
        obj: function() { return document.querySelector(".top-notification"); },
        show: function() { return this.obj().hidden = false; },
        hide: function() { return this.obj().hidden = true; }
    },
    pagination: {
        curData: 0,
        perPageData: 9,
        totalData: 0,
        prev: function() {
            if ((this.curData - this.perPageData) > 0) {
                this.curData -= this.perPageData;
            }
        },
        next: function() {
            if ((this.curData + this.perPageData) <= this.totalData) {
                this.curData += this.perPageData;
            }
        }
    },
    load: function() {
        loadBasic("live");
        page.loadSettings();
        page.updateLiveData();
        manageItemModal.load();
        page.bindEvents();
    },
    bindEvents: function() {
        document.getElementById("buy-no-of-shares").addEventListener('keyup', function() {
            page.buyModalNoOfSharesTimeOut = null;
            page.buyModalNoOfSharesTimeOut = setTimeout(function() {
                page.calculateBuyModalInfo();
            }, 1000);
        });
    },
    onOptionClick: function() {
        if (page.checkMode) {
            req.post('/live-data/update-checked-companies', JSON.stringify({ companies: page.checkedCompanies }), function() {
                page.checkMode = false;
                var floatingBtn = document.getElementById("floating-btn");
                floatingBtn.classList.remove("fa-check");
                floatingBtn.classList.add("fa-cog");
                page.pagination.curData = 1;
                refreshCompaniesList();
            }, function(err) {
                alert("There was a problem with the connection. Please try again");
            });
        } else {
            document.getElementById("settings-modal").classList.add("on");
        }
    },
    updateLiveData: function() {
        var getDataAction = function(response) {
            var offlineMode = false;
            var liveCTableChilds = [];
            var liveCObj = document.getElementById('live-data-container');
            if (response == null || '' === response) {
                page.topNotification.show();
                offlineMode = true;
            } else {
                liveCObj.innerHTML = response;
                liveCTableChilds = document.querySelectorAll("#RightBody tbody tr");
                
                if (null == liveCTableChilds || 0 == liveCTableChilds.length) {
                    page.topNotification.show();
                    offlineMode = true;
                }
            }
            if (offlineMode) {
                if (companies.length > 0) return;
                req.get('/json/last-data.json', function(response) {
                    if (response == null) { return; }
                    companies = JSON.parse(response);
                    page.bindCompaniesList(liveCObj);
                });
            } else {
                companies = [];
                page.topNotification.hide();
                liveCTableChilds.forEach(function(row, index) {
                    var company = {};
                    var cells = row.children;
                    
                    if (cells.length < 11) {
                        return;
                    }
                    company.code = (cells[1].children[0].innerHTML).trim();
                    company.ltp = ConvertFromReadable(cells[2].innerHTML);
                    company.high = ConvertFromReadable(cells[3].innerHTML);
                    company.low = ConvertFromReadable(cells[4].innerHTML);
                    company.closep = cells[5].innerHTML;
                    company.ycp = cells[6].innerHTML;
                    company.change = cells[7].innerHTML;
                    company.trade = cells[8].innerHTML;
                    company.value_mn = cells[9].innerHTML;
                    company.volume = cells[10].innerHTML;
                    company.buyTargetData = 0;
                    company.sellTargetData = 0;
                    if (0 == company.ltp && 0 == company.high && 0 == company.low)
                    {
                        var price = ConvertFromReadable(company.closep);
                        if (0 == price) price = ConvertFromReadable(company.ycp);
                        company.ltp = price;
                        company.high = price;
                        company.low = price;
                    }
                    companies.push(company);
                });
                page.bindCompaniesList(liveCObj);
            }
        };
        req.get('/live-data/get-data', function(response) {
            getDataAction(response);
        }, function(err) {
            getDataAction(null);
            page.topNotification.show();
        });
    },
    bindCompaniesList: function(liveCObj) {
        sortCompaniesList();
        req.post('/live-data/save-last-data', JSON.stringify({ companies: companies }), function() {
        }, function(err) {
            alert("There was a problem with the connection. Please try again");
        });
        liveCObj.innerHTML = "";
    },
    refresh: function() {
        page.updateLiveData();
    },
    loadSettings: function() {
        page.checkMode = false;
        var floatingBtn = document.getElementById("floating-btn");
        floatingBtn.classList.remove("fa-check");
        floatingBtn.classList.add("fa-cog");
        req.get("/json/live-settings.json", function(response) {
            if (response == null) { return; }
            page.settings = JSON.parse(response);
            var onlyShowChecked = document.getElementById("settings-only-show-checked");
            var onlyShowBuyable = document.getElementById("settings-only-show-buyable");
            var onlyShowSellable = document.getElementById("settings-only-show-sellable");

            if (page.settings.onlyShowChecked) {
                onlyShowChecked.setAttribute("checked", "");
            } else {
                onlyShowChecked.removeAttribute("checked");
            }
            if (page.settings.onlyShowBuyable) {
                onlyShowBuyable.setAttribute("checked", "");
            } else {
                onlyShowBuyable.removeAttribute("checked");
            }
            if (page.settings.onlyShowSellable) {
                onlyShowSellable.setAttribute("checked", "");
            } else {
                onlyShowSellable.removeAttribute("checked");
            }
        });
    },
    setDetailsModalData: function(key, comKey, value) {
        if (null == value) value = page.company[null == comKey ? key : comKey];
        if ("code" == key) value = "<a class='path-to-dse' href='https://dsebd.org/displayCompany.php?name=" + value + "' target='_blank'>" + value + "</a>";
        document.querySelector("#details-modal .company-" + key).innerHTML = value;
    },
    openDetailsModal: function() {
        page.setDetailsModalData("code");
        page.setDetailsModalData("ltp");
        page.setDetailsModalData("change");
        page.setDetailsModalData("high");
        page.setDetailsModalData("low");
        page.setDetailsModalData("ycp");
        page.setDetailsModalData("closep");
        page.setDetailsModalData("value-mn", "value_mn");
        page.setDetailsModalData("volume");
        page.setDetailsModalData("trade");
        var buyTarget = page.companyBuyTarget();
        var sellTarget = page.companySellTarget();
        page.setDetailsModalData("buy-target", null, buyTarget);
        page.setDetailsModalData("sell-target", null, sellTarget);
        document.querySelector("#details-modal .company-buy-target-container").hidden = buyTarget <= 0;
        document.querySelector("#details-modal .company-sell-target-container").hidden = sellTarget <= 0;
        document.querySelector("#details-modal .company-change").setAttribute("data-price-status", page.companyPriceStatus(page.company));
        document.getElementById("details-modal").classList.add("on");
    },
    closeDetailsModal: function() {
        document.getElementById("details-modal").classList.remove("on");
    },
    closeBuyModal: function() {
        document.getElementById("buy-modal").classList.remove("on");
    },
    closeSettingsModal: function() {
        document.getElementById("settings-modal").classList.remove("on");
    },
    closeTargetEditModal: function() {
        document.getElementById("target-edit-modal").classList.remove("on");
    },
    openTargetEdit: function() {
        page.closeDetailsModal();
        document.querySelector("#target-edit-modal .company-code").innerHTML = page.company.code;
        document.getElementById("company-buy-target-data").value = page.companyBuyTarget();
        document.getElementById("company-sell-target-data").value = page.companySellTarget();
        document.getElementById("target-edit-modal").classList.add("on");
    },
    openBuyModal: function() {
        page.closeDetailsModal();
        document.querySelector("#buy-modal .company-code").innerHTML = page.company.code;
        document.getElementById("buy-rate").innerHTML = page.company.ltp;
        document.getElementById("buy-modal").classList.add("on");
        document.getElementById("buy-no-of-shares").value = "";
        document.getElementById("buy-no-of-shares").focus();
    },
    updateTargetPrice: function() {
        var company = { code: page.company.code };
        var buyTargetData = document.getElementById("company-buy-target-data").value;
        var sellTargetData = document.getElementById("company-sell-target-data").value;

        if (null != buyTargetData && buyTargetData > 0) {
            company.buyRate = parseFloat(buyTargetData);
        }
        if (null != sellTargetData && sellTargetData > 0) {
            company.sellRate = parseFloat(sellTargetData);
        }
        req.post('/live-data/update-target-price', JSON.stringify({ company: company }), function() {
            var foundIndex = 0;
            var foundCompany = page.settings.companies.find(function(companyS, index) {
                var success = companyS.code === company.code;

                if (success) {
                    foundIndex = index;
                }
                return success;
            });
            
            if (foundCompany) {
                
                if (null != company.buyRate && company.buyRate > 0) {
                    page.settings.companies[foundIndex].buyRate = company.buyRate;
                }
                if (null != company.sellRate && company.sellRate > 0) {
                    page.settings.companies[foundIndex].sellRate = company.sellRate;
                }
            }
        }, function(err) {
            alert("There was a problem with the connection. Please try again");
        });
        page.closeTargetEditModal();
    },
    updateSettings: function() {
        page.settings.onlyShowChecked = document.getElementById("settings-only-show-checked").checked;
        page.settings.onlyShowBuyable = document.getElementById("settings-only-show-buyable").checked;
        page.settings.onlyShowSellable = document.getElementById("settings-only-show-sellable").checked;
        var settings = {
            onlyShowChecked: page.settings.onlyShowChecked,
            onlyShowBuyable: page.settings.onlyShowBuyable,
            onlyShowSellable: page.settings.onlyShowSellable
        };
        req.post('/live-data/update-settings', JSON.stringify({ settings: settings }), function() {
        }, function(err) {
            alert("There was a problem with the connection. Please try again");
        });
        page.closeSettingsModal();
        page.pagination.curData = 1;
        refreshCompaniesList();
    },
    switchToCheckMode: function() {
        page.checkMode = true;
        var floatingBtn = document.getElementById("floating-btn");
        floatingBtn.classList.remove("fa-cog");
        floatingBtn.classList.add("fa-check");
        page.checkedCompanies = [];
        page.closeSettingsModal();
        page.pagination.curData = 1;
        refreshCompaniesList();
    },
    sortWith: function(name) {
        if (name === sortWith.name) {
            sortWith.type = "asc" === sortWith.type ? "desc" : "asc";
        } else {
            sortWith = { name: name, type: "asc" };
        }
        document.querySelectorAll(".sort-icon").forEach(function(element) {
            element.innerHTML = "";
        });
        document.getElementById("sort-icon-" + name).innerHTML = "asc" === sortWith.type ? "▲" : "▼";
        sortCompaniesList();
    },
    companyClick: function(obj) {
        var companyCode = obj.querySelector(".company-code").innerHTML;
        if (page.checkMode) {
            var foundIndex = 0, foundSIndex = 0;
            var found = page.checkedCompanies.find(function(companyS, index) {
                var success = companyS.code === companyCode;
                
                if (success) {
                    foundIndex = index;
                }
                return success;
            });
            var foundS = page.settings.companies.find(function(companyS, index) {
                var success = companyS.code === companyCode;
                
                if (success) {
                    foundSIndex = index;
                }
                return success;
            });
            if (found) {
                page.checkedCompanies[foundIndex].checked = !found.checked;
                obj.setAttribute("data-checked", !found.checked);
            } else {
                page.checkedCompanies.push({
                    code: companyCode,
                    checked: foundS ? !foundS.checked : true
                });
                obj.setAttribute("data-checked", (foundS ? !foundS.checked : true));
            }
            if (foundS) {
                page.settings.companies[foundSIndex].checked = !foundS.checked;
            } else {
                page.settings.companies.push({ code: companyCode, checked: true });
            }
        } else {
            page.company = companies.find(function(x) { return x.code == companyCode; });
            page.openDetailsModal();
        }
    },
    companyIsChecked: function(company) {
        if (page.checkMode) {
            var matched = page.settings.companies.find(function(companyS) {
                return companyS.code === company.code && companyS.checked;
            });
            return matched ? true : false;
        } else {
            return false;
        }
    },
    companyIsInBuyableRange: function(company) {
        var foundCompany = page.settings.companies.find(function(companyS) {
            return companyS.code === company.code && null != companyS.buyRate && companyS.buyRate > 0;
        });
        return null != foundCompany && company.low <= foundCompany.buyRate;
    },
    companyIsInSellableRange: function(company) {
        var foundCompany = page.settings.companies.find(function(companyS) {
            return companyS.code === company.code && null != companyS.sellRate && companyS.sellRate > 0;
        });
        return null != foundCompany && company.high >= foundCompany.sellRate;
    },
    companyIsBuyable: function(company) {
        return !page.checkMode && page.companyIsInBuyableRange(company);
    },
    companyIsSellable: function(company) {
        return !page.checkMode && page.companyIsInSellableRange(company);
    },
    companyIsHidden: function(company) {
        if (page.checkMode || (!page.settings.onlyShowChecked
                && !page.settings.onlyShowBuyable
                && !page.settings.onlyShowSellable)) {
            return false;
        }
        var foundCompany = page.settings.companies.find(function(companyS) {
            return companyS.code === company.code;
        });
        if (!foundCompany) {
            return true;
        }
        
        if (page.settings.onlyShowChecked) {
            return !foundCompany.checked;
        } else if (page.settings.onlyShowBuyable) {
            return !page.companyIsInBuyableRange(company);
        } else if (page.settings.onlyShowSellable) {
            return !page.companyIsInSellableRange(company);
        }
        return true;
    },
    companyPriceStatus: function(company) {
        if (company.change > 0) {
            return 'up';
        } else if (company.change < 0) {
            return 'fall';
        }
        return '';
    },
    companyBuyTarget: function() {
        var foundCompany = page.settings.companies.find(function(companyS) {
            return companyS.code === page.company.code && null != companyS.buyRate;
        });
        return foundCompany ? foundCompany.buyRate : 0;
    },
    companySellTarget: function() {
        var foundCompany = page.settings.companies.find(function(companyS) {
            return companyS.code === page.company.code && null != companyS.sellRate;
        });
        return foundCompany ? foundCompany.sellRate : 0;
    },
    prevBtnClick: function() {
        page.pagination.prev();
        refreshCompaniesList();
    },
    nextBtnClick: function() {
        page.pagination.next();
        refreshCompaniesList();
    },
    calculateBuyModalInfo: function() {
        var noOfShares = ZeroIfNotNumber(document.getElementById("buy-no-of-shares").value);
        var rate = ZeroIfNotNumber(document.getElementById("buy-rate").innerHTML);
        var subTotal = (parseFloat(noOfShares) * parseFloat(rate)).toFixed(2);
        var commision = (parseFloat(subTotal) * 0.005).toFixed(2);
        var totalCost = (parseFloat(subTotal) + parseFloat(commision)).toFixed(2);
        document.getElementById("buy-sub-total").innerHTML = subTotal;
        document.getElementById("buy-commision").innerHTML = commision;
        document.getElementById("buy-total-cost").innerHTML = totalCost;
    },
    placeBuyOrder: function() {
        var noOfShares = ZeroIfNotNumber(document.getElementById("buy-no-of-shares").value);
        var rate = ZeroIfNotNumber(document.getElementById("buy-rate").innerHTML);
        var commision = document.getElementById("buy-commision").innerHTML;
        var order = {
            code: page.company.code,
            qty: noOfShares,
            rate: rate,
            commition: commision
        };
        req.post('/place-order/buy', JSON.stringify({ order: order }), function() {
            page.closeBuyModal();
            alert("Order Placed");
        }, function(err) {
            alert("There was a problem with the connection. Please try again");
        });
    },
    placeSellOrder: function() {
        if (!confirm("Sell your stock for Company: " + page.company.code)) return;
        var order = {
            code: page.company.code,
            rate:  page.company.ltp
        };
        req.post('/place-order/sell', JSON.stringify({ order: order }), function(response) {
            page.closeDetailsModal();
            alert(response);
        }, function(err) {
            alert("There was a problem with the connection. Please try again");
        });
    }
};

function ConvertFromReadable(text) {
    text = text.replace(/,/g, "");// Remove Comma (,)
    return parseFloat(text);
}

function arraySortByKey(array, info) {
    function sort(array, key, type, prev_keys) {
        return array.sort(function(a, b) {
            var prevKeysMatched = true;
            prev_keys.every(function(prev_key) {

                if (a[prev_key] !== b[prev_key]) {
                    prevKeysMatched = false;
                    return false;
                }
                return true;
            });

            if (!prevKeysMatched) {
                return 0;
            }
            var x = a[key];
            var y = b[key];

            if (typeof x === "string") {
                x = x.toLowerCase(); 
            }
            if (typeof y === "string") {
                y = y.toLowerCase();
            }
            if ('desc' === type.toLowerCase()) {
                return ((x > y) ? -1 : ((x < y) ? 1 : 0));
            } else {
                return ((x < y) ? -1 : ((x > y) ? 1 : 0));
            }
        });
    }
    var prev_keys = [];
    info.forEach(function(element) {
        sort(array, element[0], element[1], prev_keys);
        prev_keys[prev_keys.length] = element[0];
    });
}

function sortCompaniesList() {
    page.pagination.curData = 1;
    var sortedCompanies = [];
    companies.forEach(function(company) {
        sortedCompanies.push(company);
    });
    arraySortByKey(sortedCompanies, [[sortWith.name, sortWith.type]]);
    page.companies = sortedCompanies;
    refreshCompaniesList();
}

function refreshCompaniesList() {
    var compContainer = document.querySelector("#companies-container tbody");
    var filteredCompanies = page.companies.filter(function(x) { return !page.companyIsHidden(x); });
    page.pagination.totalData = filteredCompanies.length;
    var html = "";
    var firstData = page.pagination.curData;
    var lastData = page.pagination.curData + page.pagination.perPageData - 1;
    lastData = lastData > filteredCompanies.length ? filteredCompanies.length : lastData;
    for (var i = (firstData - 1); i < lastData; i++) {
        var item = filteredCompanies[i];
        html += "" +
        "<tr " + (page.companyIsHidden(item) ? "style='display: none;' " : "") +
            "onclick='page.companyClick(this)' data-checked='" + page.companyIsChecked(item) + "' " +
            "data-buyable='" + page.companyIsBuyable(item) + "' data-sellable='" + page.companyIsSellable(item) + "'>" +
            "<td class='company-code'>" + item.code + "</td>" +
            "<td data-price-status='" + page.companyPriceStatus(item) + "'>" + item.ltp + "</td>" +
            "<td>" + item.high + "</td>" +
            "<td>" + item.low + "</td>" +
        "</tr>";
    }
    compContainer.innerHTML = html;
}

function IsNumber(Value) {
    return ![null, ""].includes(Value) && !isNaN(Value);
}

function ZeroIfNotNumber(Value) {
    return IsNumber(Value) ? Value : 0;
}

(function() {
    page.load();
})();