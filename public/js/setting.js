"use strict";

var app = angular.module('StockApp', []);

app.controller('StockAppController', function($scope, $http) {
    loadBasic('setting');
    
    $scope.save = function() {
        var settings = {
            user: $scope.user
        };
        $http.post('/setting/save', JSON.stringify({ settings: settings })).then(function() {
            window.location.href = '/';
        }, function(err) {
            alert("There was a problem with the connection. Please try again");
        });
    };
    
    $http.get('json/user-settings.json').then(function(response) {
        $scope.users = response.data.users;
        $scope.user = response.data.currentUser;
    }); 
});