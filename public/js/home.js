"use strict";
/* global database:true */

var app = angular.module('StockApp', []);

app.controller('StockAppController', function($scope, $http) {
    loadBasic('home');
    $scope.currentPage = 'home';
    $scope.stock = {};
    $scope.showHomePage = function() {
        return 'home' === $scope.currentPage ? 'on' : '';
    };
    $scope.showStockCalculatePage = function() {
        return 'stock-calculate' === $scope.currentPage ? 'on' : '';
    };
    $scope.toPage = function(page) {
        $scope.currentPage = page;
    };

    $http.get('json/' + database + '.json').then(function(response) {
        $scope.stocks = [];

        Object.keys(response.data.current).forEach(function(key) {
            var stock = response.data.current[key];
            stock.Name = key;
            stock.calculate = function() {
                $scope.stock = stock;
                $scope.saleRate = 0;
                $scope.currentPage = 'stock-calculate';
                $scope.includeBonus = true;
            };
            stock.subtotal = function() {
                return parseFloat(this.Rate) * parseFloat(this.Quantity);
            };
            stock.subtotalText = function() {
                return this.subtotal().toFixed(2);
            };
            stock.total = function() {
                return this.subtotal() + parseFloat(this.Commition);
            };
            stock.totalText = function() {
                return this.total().toFixed(2);
            };
            stock.safeSaleRate = function() {
                if (this.includeBonus()) {
                    return (this.total() / (this.quantityWithBonus() * 0.995)).toFixed(2);
                } else {
                    return (this.total() / (parseFloat(this.Quantity) * 0.995)).toFixed(2);
                }
            };
            stock.sellSubtotalAmount = function() {
                if (this.includeBonus()) {
                    return parseFloat($scope.saleRate) * this.quantityWithBonus();
                } else {
                    return parseFloat($scope.saleRate) * parseFloat(this.Quantity);
                }
            };
            stock.sellSubtotalAmountText = function() {
                return this.sellSubtotalAmount().toFixed(2);
            };
            stock.sellCommissionAmount = function() {
                return (this.sellSubtotalAmount() * 0.005).toFixed(2); // 0.5 % commission for broker house
            };
            stock.sellTotalAmount = function() {
                return this.sellSubtotalAmount() - parseFloat(this.sellCommissionAmount());
            };
            stock.sellTotalAmountText = function() {
                return this.sellTotalAmount().toFixed(2);
            };
            stock.income = function() {
                return (this.sellTotalAmount() - this.total()).toFixed(2);
            };
            stock.bonusQuantity = function() {
                return null == this.BonusQty ? 0 : this.BonusQty;
            };
            stock.showBonusQuantity = function() {
                return this.bonusQuantity() > 0;
            };
            stock.includeBonus = function() {
                return this.showBonusQuantity() && $scope.includeBonus;
            };
            stock.quantityWithBonus = function() {
                return parseFloat(this.Quantity) + parseFloat(this.bonusQuantity());
            };
            $scope.stocks.push(stock);
        });
    });
});