"use strict";

var app = angular.module('StockApp', []);

app.controller('StockAppController', function($scope, $http) {
    loadBasic('calculator');
    $scope.rate = 0;
    $scope.noOfShares = 0;
    $scope.bonusQty = 0;
    $scope.investmentAmount = 0;
    $scope.saleRate = 0;

    function stockCalculationAllowed()
    {
        return '' !== $scope.rate && '' !== $scope.noOfShares;
    }

    function subtotalAmount()
    {
        return stockCalculationAllowed() ? parseFloat($scope.rate) * parseFloat($scope.noOfShares) : 0;
    }

    function commissionAmount()
    {
        return (stockCalculationAllowed() ? subtotalAmount() * 0.005 : 0).toFixed(2); // 0.5 % commission for broker house
    }

    function totalAmount()
    {
        return stockCalculationAllowed() ? subtotalAmount() + parseFloat(commissionAmount()) : 0;
    }

    function sellStockCalculationAllowed()
    {
        return stockCalculationAllowed() && '' !== $scope.saleRate && 0 !== $scope.saleRate;
    }

    function sellSubtotalAmount()
    {
        return sellStockCalculationAllowed() ? parseFloat($scope.saleRate) * parseFloat(quantityWithBonus()) : 0;
    }

    function sellCommissionAmount()
    {
        return (sellStockCalculationAllowed() ? sellSubtotalAmount() * 0.005 : 0).toFixed(2); // 0.5 % commission for broker house
    }

    function sellTotalAmount()
    {
        return sellStockCalculationAllowed() ? sellSubtotalAmount() - parseFloat(sellCommissionAmount()) : 0;
    }
    
    function quantityWithBonus()
    {
        var noOfShares = [null, ''].includes($scope.noOfShares) ? 0 : parseFloat($scope.noOfShares);
        var bonusQty = [null, ''].includes($scope.bonusQty) ? 0 : parseFloat($scope.bonusQty);
        return noOfShares + bonusQty;
    }

    $scope.subtotalAmount = function() {
        return subtotalAmount().toFixed(2);
    };

    $scope.commissionAmount = function() {
        return commissionAmount();
    };

    $scope.totalAmount = function() {
        return totalAmount().toFixed(2);
    };

    $scope.safeSaleRate = function() {
        //return (stockCalculationAllowed() ? $scope.rate * (1.005 / 0.995) : 0).toFixed(2);
        return (totalAmount() / (quantityWithBonus() * 0.995)).toFixed(2);
    };

    $scope.sellSubtotalAmount = function() {
        return sellSubtotalAmount().toFixed(2);
    };

    $scope.sellCommissionAmount = function() {
        return sellCommissionAmount();
    };

    $scope.sellTotalAmount = function() {
        return sellTotalAmount().toFixed(2);
    };

    $scope.income = function() {
        return (sellStockCalculationAllowed() ? sellTotalAmount() - totalAmount() : 0).toFixed(2);
    };
    
    $scope.calculateNoOfShares = function() {
        
        if ('' !== $scope.rate && '' !== $scope.investmentAmount && 0 !== $scope.investmentAmount) {
            $scope.noOfShares = parseInt(($scope.investmentAmount * 0.995) / $scope.rate);
        }
    };
});