/*
 Licensed to the Apache Software Foundation (ASF) under one or more
 contributor license agreements.  See the NOTICE file distributed with
 this work for additional information regarding copyright ownership.
 The ASF licenses this file to You under the Apache License, Version 2.0
 (the "License"); you may not use this file except in compliance with
 the License.  You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/


// checkForSlows: Checks if there is a pending async URL fetching
// that is delayed for more than 2.5 seconds. If found, display the
// spinner, thus letting the user know that the resource is pending.
var pending_urls = []
var wa = false


Number.prototype.pad = function(size) {
    var str = String(this);
    while (str.length < size) {
        str = "0" + str;
    }
    return str;
}


function formatDate(date){
    return (date.getFullYear() + "-" +
        (date.getMonth()+1).pad(2) + "-" +
        date.getDate().pad(2) + " " +
        date.getHours().pad(2) + ":" +
        date.getMinutes().pad(2))        
}

function checkForSlows() {
    var slows = 0
    var now = new Date().getTime() / 1000;
    for (var x in pending_urls) {
        if ((now - pending_urls[x]) > 2.5) {
            slows++;
            break
        }
    }
    if (slows == 0) {
        showSpinner(false)
    } else {
        showSpinner(true);
    }
}

// GetAsync: func for getting a doc async with a callback
function GetAsync(theUrl, xstate, callback) {
    var xmlHttp = null;
    if (window.XMLHttpRequest) {
        xmlHttp = new XMLHttpRequest();
    } else {
        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    }
    if (pending_urls) {
        pending_urls[theUrl] = new Date().getTime() / 1000;
    }
    xmlHttp.open("GET", theUrl, true);
    xmlHttp.send(null);
    xmlHttp.onprogress = function() {
        checkForSlows()
    }
    xmlHttp.onerror = function() {
        delete pending_urls[theUrl]
        checkForSlows()
    }
    xmlHttp.onreadystatechange = function(state) {
        if (xmlHttp.readyState == 4) {
            delete pending_urls[theUrl]
        }
        checkForSlows()
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
            if (callback) {
                try {
                    callback(JSON.parse(xmlHttp.responseText), xstate);
                } catch (e) {
                    callback(JSON.parse(xmlHttp.responseText), xstate)
                }
            }

        }
        if (xmlHttp.readyState == 4 && xmlHttp.status == 404) {
            alert("404'ed: " + theUrl)
        }
    }
}

// spinner for checkForSlows
function showSpinner(show) {
    var obj = document.getElementById('spinner')
    if (!obj) {
        obj = document.createElement('div')
        obj.setAttribute("id", "spinner")
        obj.innerHTML = "<img src='spinner.gif'>"
        document.body.appendChild(obj)
    }
    if (show) {
        obj.style.display = "block"
    } else {
        obj.style.display = "none"
    }
}

function renderRepos(json) {
    var obj = document.getElementById('repolist')
    if (json && json.constructor == Object) {
        var projects = []
        for (var k in json) {
            projects.push(k)
        }
        projects.sort()
        obj.innerHTML = ""
        for (var i in projects) {
            var project = projects[i]
            var list = json[project]
            list.sort()
            var li = "<li><b>" + project + ":\n<ul>"
            for (var r in list) {
                var repo = list[r]
                li += "<li><a href='https://github.com/apache/" + repo + "'>" + repo + "</a></li>"
            }
            li += "</ul></li>"
            obj.innerHTML += li
        }
    } else {
        obj.innerHTML += "<li>Something went wrong :( Please try again in a few minutes."
    }
    
}

function renderPage(json) {
    // logged in via ASF?
    
    
    // Step 1: ASF Auth
    var obj = document.getElementById('asfauth')
    if (json && json.uid && json.fullname) {
        var fname = json.fullname.split(" ")[0]
        obj.innerHTML = "<h3>ASF Auth: Authed</h3>"
        obj.innerHTML += "<big>Welcome back, " + fname + "!</big><br/>"
        obj.innerHTML += "<small style='color: #269;'><i>Not " + fname + "? <a href='oauth.cgi?logout=true'>Log out</a> then!</i></small><br/>"
        obj.setAttribute("class", "tc_good tc")
    } else {
        obj.innerHTML = "<h3>ASF Auth: Not authed</h3>Start off by logging in with Apache OAuth to begin your account merge process.<br/><a href='oauth.cgi?redirect=apache' class='btn'>Start ASF Oauth</a>"
    }
    
    // Step 2: GitHub Auth
    obj = document.getElementById('github')
    if (json.external && json.external.github) {
        obj.innerHTML = "<h3>GitHub: Authed</h3>"
        obj.innerHTML += "<p>You are currently authed as <kbd>" + json.external.github.username + "</kbd> on GitHub. (not the right account? <a href=oauth.cgi?unauth=github'>Reset your GitHub info then</a>.)"
        obj.setAttribute("class", "tc_good tc")
        var extra = ""
        if (document.location.search.length > 1) {
            var m = document.location.search.match(/user=([-.a-z0-9]+)/i)
            if (m) {
                extra = "?user=" + m[1]
                obj.innerHTML += "<i>Debug: matching against availid <kbd>" + m[1] + "</kbd>.</i><br/>"
            }
        }
    } else if (json.uid) {
        obj.innerHTML = "<h3>GitHub: Not authed</h3>"
        obj.innerHTML += "<br/>Just two steps to go! Please Log in with your GitHub account to complete your merge application and see which repositories you have access to.<br/><a href='api/auth.lua?redirect=github' class='btn'>Auth on GitHub</a>"
    }
    
    // Step 3: MFA
    obj = document.getElementById('mfa')

    if (json.external && json.external.github && json.external.github.mfa) {
        var mfa = json.external.github.mfa
        var t = "Unknown, not part of the Apache organisation on GitHub yet."
        var s = "???"
        if (mfa  == 'enabled') {
            t = "<b style='color: green;'>ENABLED</b>"
            s = "Write access granted"
            obj.setAttribute("class", "tc_good tc")
            wa = true
        } else if (mfa == 'disabled') {
            s = "Write access suspended"
            t = "<b style='color: red;'>DISABLED</b>"
            obj.setAttribute("class", "tc_bad tc")
        }
        obj.innerHTML += "<h3>MFA: " + t + "</h3>" + s
        
        
        obj = document.getElementById('bread')
        if (wa) {
            obj.innerHTML += "<p>You will have access to the following repositories:</p>"
            obj.innerHTML += "<ul id='repolist'><li>Loading repository list, hang on..!</li></ul>"
            GetAsync("api/repos.lua" + extra, null, renderRepos)
            
            
        } else {
            obj.innerHTML += "<p>You will need to enable multi-factor authentication before you can continue.<br/>See <a style='color: #FFF;' href='https://github.com/blog/1614-two-factor-authentication'>this page for more information</a>.</p>"
        }
    }
    
    
    
}

function loadUserData() {
    GetAsync("oauth.cgi?load=true", null, renderPage)
}

// Check for slow URLs every 0.5 seconds
window.setInterval(checkForSlows, 500)
