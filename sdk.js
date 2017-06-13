/*
 (c) Jun Zheng 2017
*/

var LightningChat = {
    devMode: false,
    sessionKey: false,
    apiBase: "",
    messages: [],
    status:null,
    init: function(callback){
        LightningChat.sessionKey = LightningChat.getCookie("lcskey");
        LightningChat.getSession(this.sessionKey, function(result){
            if(!result){
                LightningChat.newSession(function(result){
                    // Initialize again
                    LightningChat.init(callback);
                })
            } else {
                console.log("LightningChat initialized, session key -> " + LightningChat.sessionKey);
                LightningChat.messages = result;
                console.log(result);
                LightningChat.onMessageLoaded(result);
                LightningChat.beginHeartBeat();
                LightningChat.beginCheckInterval();
                callback();
            }
        })
    },
    onMessageLoaded: function(messages){},
    onNewMessage: function(new_message){},
    onStatusChange: function(stat){},
    beginCheckInterval: function(){
        setInterval(function(){
            LightningChat.ajax.get(LightningChat.apiBase + "/sessions/" + LightningChat.sessionKey, {}, function(data){
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    // Failed to parse response
                    console.log("Failed to parse response (checkInterval)");
                    return;
                }
                if(data.status && data.status == "notfound"){
                    // Session key not found
                    console.log("Session key not found (checkInterval)");
                } else {
                    for (i = data.length - (data.length - LightningChat.messages.length); i < data.length; i++){
                        LightningChat.onNewMessage(data[i]);
                    }
                    LightningChat.messages = data;
                }
            })
            LightningChat.ajax.get(LightningChat.apiBase + "/sessions/" + LightningChat.sessionKey + "/info", {}, function(data){
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    // Failed to parse response
                    console.log("Failed to parse response (checkInterval-info)");
                    return;
                }
                if(data.status && data.status == "notfound"){
                    // Session key not found
                    console.log("Session key not found (checkInterval-info)");
                } else {
                    if(LightningChat.status != data.status){
                        LightningChat.onStatusChange(data.status);
                    }
                    LightningChat.status = data.status;
                }
            })
        }, 2000);
    },
    loadSessionEmail: function(callback){
        LightningChat.ajax.get(LightningChat.apiBase + "/sessions/" + LightningChat.sessionKey + "/info", {}, function(data){
            try {
                data = JSON.parse(data);
            } catch (e) {
                // Failed to parse response
                callback(false); return;
            }
            if(data.status && data.status == "notfound"){
                // Session key not found
                callback(false);
            } else {
                // Session key found
                if(data.email == "none"){
                    callback(false);
                } else {
                    console.log(data);
                    callback(data.email);
                }
            }
        })
    },
    setSessionEmail: function(email, callback){
        LightningChat.ajax.post(LightningChat.apiBase + "/sessions/" + LightningChat.sessionKey + "/email", {email: email}, function(data){
            try {
                data = JSON.parse(data);
            } catch (e) {
                // Failed to parse response
                callback(false); return;
            }
            if(data.status && data.status != "ok"){
                callback(false);
            } else {
                callback(true);
            }
        })
    },
    validateEmail: function(email) {
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    },
    sendMessage: function(message, callback){
        LightningChat.ajax.post(LightningChat.apiBase + "/sessions/" + LightningChat.sessionKey, {message: message}, function(data){
            try {
                data = JSON.parse(data);
            } catch (e) {
                // Failed to parse response
                callback(false); return;
            }
            if(data.status && data.status != "ok"){
                callback(false);
            } else {
                callback(true);
            }
        })
    },
    beginHeartBeat: function(){
        setInterval(function(){
            LightningChat.ajax.get(LightningChat.apiBase + "/sessions/" + LightningChat.sessionKey + "/heartbeat", {}, function(){
                console.log("Heartbeat finished at " + (new Date()));
            })
        }, 5000);
    },
    getCookie: function(cname) {
        var name = cname + "=";
        var decodedCookie = decodeURIComponent(document.cookie);
        var ca = decodedCookie.split(';');
        for(var i = 0; i <ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return false;
    },
    // Get basic information about a session
    getSession: function(sessionKey, callback) {
        this.ajax.get(this.apiBase + "/sessions/" + sessionKey, {}, function(data){
            try {
                data = JSON.parse(data);
            } catch (e) {
                // Failed to parse response
                callback(false); return;
            }
            if(data.status && data.status == "notfound"){
                // Session key not found
                callback(false);
            } else {
                // Session key found
                callback(data);
            }
        })
    },
    // Create a new session
    newSession: function(callback) {
        LightningChat.ajax.post(LightningChat.apiBase + "/sessions" , {}, function(data){
            try {
                data = JSON.parse(data);
            } catch (e) {
                callback(false); return;
            }
            LightningChat.setCookie("lcskey", data.session_id, 365);
            callback(true);
        })
    },
    setCookie: function(cname, cvalue, exdays) {
        var d = new Date();
        d.setTime(d.getTime() + (exdays*24*60*60*1000));
        var expires = "expires="+ d.toUTCString();
        document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
    },
    ajax: {
        x:function () {
            if (typeof XMLHttpRequest !== 'undefined') {
                return new XMLHttpRequest();
            }
            var versions = [
                "MSXML2.XmlHttp.6.0",
                "MSXML2.XmlHttp.5.0",
                "MSXML2.XmlHttp.4.0",
                "MSXML2.XmlHttp.3.0",
                "MSXML2.XmlHttp.2.0",
                "Microsoft.XmlHttp"
            ];

            var xhr;
            for (var i = 0; i < versions.length; i++) {
                try {
                    xhr = new ActiveXObject(versions[i]);
                    break;
                } catch (e) {
                }
            }
            return xhr;
        },
        send:function (url, callback, method, data, async) {
            if (async === undefined) {
                async = true;
            }
            var x = LightningChat.ajax.x();
            x.open(method, url, async);
            x.onreadystatechange = function () {
                if (x.readyState == 4) {
                    callback(x.responseText)
                }
            };
            if (method == 'POST') {
                x.setRequestHeader('Content-type', 'application/json');
            }
            x.send(data)
        },
        get:function (url, data, callback, async) {
            var query = [];
            for (var key in data) {
                query.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
            }
            LightningChat.ajax.send(url + (query.length ? '?' + query.join('&') : ''), callback, 'GET', null, async)
        },
        post:function (url, data, callback, async) {
            LightningChat.ajax.send(url, callback, 'POST', JSON.stringify(data), async)
        }
    }
}