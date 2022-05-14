"use strict";
/* global database:true */

var app = angular.module('StockApp', []);

function toDate(date)
{
    var result = new Date(Date.now());

    if (null !== date) {
        result = new Date(Date.parse(date.toString()));
    }
    return result;
}

function ReadableToDate(text)
{
    var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var dataArray = text.split("-");
    var date = new Date(Date.now());
    date.setDate(parseInt(dataArray[0]));
    date.setMonth(monthNames.indexOf(dataArray[1]));
    date.setFullYear(parseInt(dataArray[2]));
    return date;
}

function isNullOrEmpty(data)
{
    return null == data || '' === data;
}

app.controller('StockAppController', function($scope, $http) {
    loadBasic('history');
    $scope.currentPage = 'history';
    $scope.history = [];
    $scope.historyDetails = {};
    $scope.historyFilter = {
        Name: "",
        BuyDateFrom: "",
        BuyDateTo: "",
        SellDateFrom: "",
        SellDateTo: ""
    };
    $scope.btnOptionClass = function() {
        return 'history-filter' === $scope.currentPage ? 'fa-check' : 'fa-filter';
    };
    $scope.btnOptionClick = function() {
        if ('history-filter' === $scope.currentPage) {
            $scope.filterHistory();
        } else {
            $scope.toPage('history-filter');
        }
    };
    $scope.showHistoryPage = function() {
        return 'history' === $scope.currentPage ? 'on' : '';
    };
    $scope.showHistoryFilterPage = function() {
        return 'history-filter' === $scope.currentPage ? 'on' : '';
    };
    $scope.showHistoryDetailsPage = function() {
        return 'history-details' === $scope.currentPage ? 'on' : '';
    };
    $scope.historyPage = function() {
        $scope.historyFilter = {
            Name: "",
            BuyDateFrom: "",
            BuyDateTo: "",
            SellDateFrom: "",
            SellDateTo: ""
        };
        $scope.history.forEach(function(history) {
            history.display = true;
        });
        $scope.toPage('history');
    };
    $scope.filterHistory = function() {
        var filterName = $scope.historyFilter.Name.toUpperCase();
        var BuyDateFrom = toDate($scope.historyFilter.BuyDateFrom);
        var BuyDateTo = toDate($scope.historyFilter.BuyDateTo);
        var SellDateFrom = toDate($scope.historyFilter.SellDateFrom);
        var SellDateTo = toDate($scope.historyFilter.SellDateTo);

        $scope.history.forEach(function(history) {
            history.display = false;
            var historyBuyDate = ReadableToDate(history.BuyDate);
            var historySellDate = ReadableToDate(history.SellDate);

            if ((history.Name.toUpperCase().indexOf(filterName) > -1 || '' === filterName)
                    && (isNullOrEmpty($scope.historyFilter.BuyDateFrom)
                    || isNullOrEmpty($scope.historyFilter.BuyDateTo)
                    || BuyDateFrom <= historyBuyDate && BuyDateTo >= historyBuyDate )
                    && (isNullOrEmpty($scope.historyFilter.SellDateFrom)
                    || isNullOrEmpty($scope.historyFilter.SellDateTo)
                    || SellDateFrom <= historySellDate && SellDateTo >= historySellDate)
                    ) {
                history.display = true;
            }
        });
        $scope.toPage('history');
    };
    $scope.toPage = function(page) {
        $scope.currentPage = page;
    };

    $http.get('json/' + database + '.json').then(function(response) {
        $scope.history = response.data.history;

        $scope.history.forEach(function(history) {
            history.display = true;
            history.details = function() {
                $scope.historyDetails = history;
                $scope.toPage('history-details');
            };
            history.subtotal = function() {
                return parseFloat(this.BuyRate) * parseFloat(this.Quantity);
            };
            history.subtotalText = function() {
                return this.subtotal().toFixed(2);
            };
            history.total = function() {
                return this.subtotal() + parseFloat(this.BuyCommition);
            };
            history.totalText = function() {
                return this.total().toFixed(2);
            };
            history.sellSubtotalAmount = function() {
                if (this.showBonusQuantity()) {
                    return parseFloat(this.SellRate) * this.quantityWithBonus();
                } else {
                    return parseFloat(this.SellRate) * parseFloat(this.Quantity);
                }
            };
            history.sellSubtotalAmountText = function() {
                return this.sellSubtotalAmount().toFixed(2);
            };
            history.sellTotalAmount = function() {
                return this.sellSubtotalAmount() - parseFloat(this.SellCommition);
            };
            history.sellTotalAmountText = function() {
                return this.sellTotalAmount().toFixed(2);
            };
            history.income = function() {
                return (this.sellTotalAmount() - this.total()).toFixed(2);
            };
            history.bonusQuantity = function() {
                return null == this.BonusQty ? 0 : this.BonusQty;
            };
            history.showBonusQuantity = function() {
                return this.bonusQuantity() > 0;
            };
            history.quantityWithBonus = function() {
                return parseFloat(this.Quantity) + parseFloat(this.bonusQuantity());
            };
        });
    });
});