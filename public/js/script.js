"use strict";
/* global database:true */

var req = {
    get: function(url, successCallback, errorCallback) {
        var http = new XMLHttpRequest();
        http.open("GET", url);
        http.onreadystatechange = function(e) {
            if (this.readyState == 4) {
                if (this.status == 200) {
                    if (successCallback) { successCallback(http.responseText); }
                } else {
                    if (errorCallback) { errorCallback(http.statusText); }
                }
            }
        }
        http.send();
    },
    post: function(url, params, successCallback, errorCallback) {
        var http = new XMLHttpRequest();
        http.open("POST", url, true);
        http.setRequestHeader("Content-type", "application/json; charset=utf-8");
        http.onreadystatechange = function(e) {
            if (this.readyState == 4) {
                if (this.status == 200) {
                    if (successCallback) { successCallback(http.responseText); }
                } else {
                    if (errorCallback) { errorCallback(http.statusText); }
                }
            }
        }
        http.send(params);
    }
};

function menuSelectItem(name)
{
    document.querySelector('.site-navbar-primary li:not(:last-child)').classList.remove('on');
    document.querySelector('.site-navbar-primary [data-id="' + name + '"]').classList.add('on');
}

function goToPage(url)
{
    window.location.href = url;
}

function loadBasic(name)
{
    req.get('/html/menu.html', function(response) {
        if (null == response) return;
        document.getElementsByClassName('site-navbar-primary')[0].innerHTML = response;
        menuSelectItem(name);
    });
}