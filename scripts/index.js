const {ipcRenderer} = require('electron');
var moment = require('moment');
var humanizeDuration = require('humanize-duration');
var fs = require('fs');
const {dialog} = require('electron').remote;
const {app} = require('electron').remote;
const storage = require('electron-json-storage');

var App = angular.module('App', []).run(function($rootScope) {
    $rootScope.downloading = false;
    $rootScope.AppLoaded = true;
    $rootScope.ArmaPath = "";

    try {
        fs.lstatSync(app.getPath('userData') + "\\settings.json");
    } catch (e) {

    }

});

App.controller('navbarController', ['$scope','$rootScope', function ($scope,$rootScope) {
    $scope.slide = 0;

    $scope.tabs = [
        {
            icon: 'glyphicon glyphicon-home', slide: 0
        }, {
            icon: 'glyphicon glyphicon-tasks',  slide: 1
        }, {
            icon: 'glyphicon glyphicon-list-alt', slide: 2
        }, {
            icon: 'glyphicon glyphicon-cog', slide: 3
        }];

    $scope.switchSlide = function (tab) {
        $scope.slide = tab.slide;
    };

    $scope.$watch(
        "slide", function () {
            $("#carousel-main").carousel($scope.slide);
        }, true);

    $scope.refresh = function () {
        getMods();
        getServers();
    };
}]);

App.controller('modController', ['$scope','$rootScope', function ($scope,$rootScope) {

    $scope.state = "Gestoppt";
    $rootScope.downloading = false;
    $rootScope.downSpeed = 0;
    $rootScope.upSpeed = 0;
    $scope.totalProgress = "";
    $scope.totalSize = 0;
    $scope.totalDownloaded = 0;
    $scope.totalETA = "";
    $scope.totalPeers = 0;
    $scope.maxConns = 0;
    $scope.fileName = "";
    $scope.fileProgress = "";

    ipcRenderer.on('to-app', (event, args) => {
        switch (args.type) {
    case "mod-callback":
        $scope.mods = args.data.data;
        $scope.loading = false;
        $scope.checkUpdates();
        $scope.$apply();
        $('#modScroll').perfectScrollbar();
        break;
    case "update-dl-progress-server":
        $scope.update({
            state: "Server - Verbunden",
            hint: "",
            downloading: true,
            downSpeed: toMB(args.state.speed),
            upSpeed: 0,
            totalProgress: toFileProgress(args.state.totalSize,args.state.totalDownloaded),
            totalSize: toGB(args.state.totalSize),
            totalDownloaded: toGB(args.state.totalDownloaded),
            totalETA: "",
            totalPeers: 0,
            maxConns: 0,
            fileName: cutName(args.fileName),
            fileProgress: toProgress(args.state.percent)
        });
        $scope.graphTimeline.append(new Date().getTime(),toMB(args.state.speed));
        $scope.$apply();
        break;
    case "update-dl-progress-torrent":
        $scope.update({
            state: "Torrent - Verbunden",
            hint: "",
            downloading: true,
            downSpeed: toMB(args.state.torrentDownloadSpeedState),
            upSpeed: toMB(args.state.torrentUploadSpeedState),
            totalProgress: toProgress(args.state.torrentProgressState),
            totalSize: toGB(args.state.torrentSizeState),
            totalDownloaded: toGB(args.state.torrentDownloadedState),
            totalETA: humanizeDuration(Math.round(args.state.torrentETAState), {language: 'de', round: true}),
            totalPeers: args.state.torrentNumPeersState,
            maxConns: args.state.torrentMaxConnsState,
            fileName: "",
            fileProgress: ""
        });
        $scope.graphTimeline.append(new Date().getTime(),toMB(args.state.torrentDownloadSpeedState));
        $scope.$apply();
        break;
    case "torrent-init":
        $scope.update({
            state: "Torrent - Verbinden...",
            hint: "",
            downloading: true,
            downSpeed: 0,
            upSpeed: 0,
            totalProgress: "",
            totalSize: 0,
            totalDownloaded: 0,
            totalETA: "",
            totalPeers: 0,
            maxConns: 0,
            fileName: "",
            fileProgress: ""
        });
        break;
    case "status-change":
        $scope.update({
            state: args.status,
            hint: args.hint,
            downloading: args.downloading,
            downSpeed: 0,
            upSpeed: 0,
            totalProgress: "",
            totalSize: 0,
            totalDownloaded: 0,
            totalETA: "",
            totalPeers: 0,
            maxConns: 0,
            fileName: "",
            fileProgress: ""
        });
        break;
    case "update-hash-progress":
        $scope.update({
            state: "Überprüfung - Läuft",
            hint: "",
            downloading: true,
            downSpeed: toMB(args.state.speed),
            upSpeed: 0,
            totalProgress: toProgress(args.state.index/args.state.size),
            totalSize: 0,
            totalDownloaded: 0,
            totalETA: "",
            totalPeers: 0,
            maxConns: 0,
            fileName: cutName(args.fileName),
            fileProgress: ""
        });
        break;
    case "update-hash-progress-done":
        $scope.update({
            state: "Überprüfung - Abgeschlossen",
            hint: "",
            downloading: true,
            downSpeed: 0,
            upSpeed: 0,
            totalProgress: 100,
            totalSize: 0,
            totalDownloaded: 0,
            totalETA: "",
            totalPeers: 0,
            maxConns: 0,
            fileName: "",
            fileProgress: ""
        });
        var size = 0;
        for(var i = 0; i < args.list.length ; i++) {
            size += args.list[i].Size;
        }
        if(size != 0) {
            alertify.set({ labels : { ok: "Torrent", cancel: "Server" } });
            alertify.confirm(args.list.length + " Dateien müssen heruntergelanden werden (" + toGB(size) + " GB)", function (e) {
                if (e) {
                    $scope.reset();
                    $scope.initListDownload(args.list, true, args.mod);
                } else {
                    $scope.reset();
                    $scope.initListDownload(args.list, false, args.mod);
                }
            });
            spawnNotification(args.list.length + " Dateien müssen heruntergelanden werden (" + toGB(size) + " GB)");
            $scope.$apply();
        } else {
            spawnNotification("Überprüfung abgeschlossen - Mod ist aktuell.");
            $scope.reset();
        }
        break;
    case "update-dl-progress-done":
        $scope.state = "Abgeschlossen";
        $scope.progress = 100;
        spawnNotification("Download abgeschlossen.");
        $scope.reset();
        $scope.checkUpdates();
        break;
    case "reset":
        //$scope.reset();
        //$scope.$apply();
        break;
    case "update-quickcheck":
        for (var j = 0; j < $scope.mods.length; j++) {
            if ($scope.mods[j].Id == args.mod.Id) {
                if (args.update == 0) {
                    $scope.mods[j].state = [1,"Downloaden"];
                } else if (args.update == 1) {
                    $scope.mods[j].state = [2,"Update verfügbar"];
                } else {
                    $scope.mods[j].state = [3,"Spielen"];
                }
            }
        }
        $scope.$apply();
        break;
    }
});

    $scope.reset = function () {
        $scope.update({
            state: "Gestoppt",
            hint: "",
            downloading: false,
            downSpeed: 0,
            upSpeed: 0,
            totalProgress: "",
            totalSize: 0,
            totalDownloaded: 0,
            totalETA: "",
            totalPeers: 0,
            maxConns: 0,
            fileName: "",
            fileProgress: ""
        });
    };

    $scope.init = function () {
        $scope.loading = true;
        getMods();
        $scope.initGraph();
    };

    $scope.initDownload = function (mod) {
        $scope.update({
            state: "Download wird gestarted...",
            hint: "",
            downloading: true,
            downSpeed: 0,
            upSpeed: 0,
            totalProgress: "",
            totalSize: 0,
            totalDownloaded: 0,
            totalETA: "",
            totalPeers: 0,
            maxConns: 0,
            fileName: "",
            fileProgress: ""
        });
        var args = {
            type: "start-mod-dwn",
            mod: mod,
            path : $rootScope.ArmaPath
        };
        ipcRenderer.send('to-dwn', args);
    };

    $scope.initHash = function (mod) {
        alertify.log("Überprüfung wird gestartet", 'primary');
        var args = {
            type: "start-mod-hash",
            mod: mod,
            path: $rootScope.ArmaPath
        };
        ipcRenderer.send('to-dwn', args);
    };

    $scope.initListDownload = function(list, torrent, mod) {
        $scope.update({
            state: "Download wird gestarted...",
            hint: "",
            downloading: true,
            downSpeed: 0,
            upSpeed: 0,
            totalProgress: 0,
            totalSize: 0,
            totalDownloaded: 0,
            totalETA: "",
            totalPeers: 0,
            maxConns: 0,
            fileName: "",
            fileProgress: ""
        });
        var args = {
            type: "start-list-dwn",
            list: list,
            torrent: torrent,
            mod: mod,
            path: $rootScope.ArmaPath
        };
        ipcRenderer.send('to-dwn', args);
    };

    $scope.initGraph = function () {
        $scope.chart = new SmoothieChart({
            millisPerPixel: 20,
            grid: {fillStyle: '#ffffff',strokeStyle:'#ffffff'},
            labels: {fillStyle: '#000000', disabled: true}
        });

        canvas = document.getElementById('smoothie-chart');

        $scope.graphTimeline = new TimeSeries();
        $scope.chart.addTimeSeries($scope.graphTimeline, {lineWidth: 2, strokeStyle: '#2780e3'});
        $scope.chart.streamTo(canvas, 1000);
    };

    $scope.cancel = function () {
        var args = {
            type: "cancel"
        };
        ipcRenderer.send('to-dwn', args);
    };

    $scope.update = function (update) {
        $scope.state = update.state;
        $scope.hint = update.hint;
        $rootScope.downloading = update.downloading;
        $rootScope.downSpeed = update.downSpeed;
        $rootScope.upSpeed = update.upSpeed;
        $scope.totalProgress = update.totalProgress;
        $scope.totalSize = update.totalSize;
        $scope.totalDownloaded = update.totalDownloaded;
        $scope.totalETA = update.totalETA;
        $scope.totalPeers = update.totalPeers;
        $scope.maxConns = update.maxConns;
        $scope.fileName = update.fileName;
        $scope.fileProgress = update.fileProgress;
        $scope.$apply();
    };

    $scope.$watch(
        "progress", function () {
            var args = {
                progress: $scope.progress/100
            };
            ipcRenderer.send('winprogress-change', args);
        }, true);

    $rootScope.$watch(
        "ArmaPath", function () {
            if($scope.mods !== undefined) {
                $scope.checkUpdates();
            };
        }, true);

    $scope.action = function (mod) {
        switch (mod.state[0]) {
            case 1:
                $scope.initDownload(mod);
                break;
            case 2:
                $scope.initHash(mod);
                break;
            case 3:
                angular.element($('#bs-navbar-collapse')).injector().switchSlide({slide: 1});
                break;
            default:
                break;
        }
    };

    $scope.checkUpdates = function () {
        for(var i = 0; i < $scope.mods.length; i++) {
            if($rootScope.ArmaPath !== ''){
                $scope.mods[i].state = [0,"Suche nach Updates..."];
                var args = {
                    type: "start-mod-quickcheck",
                    mod: $scope.mods[i],
                    path: $rootScope.ArmaPath
                };
                ipcRenderer.send('to-dwn', args);
            } else {
                $scope.mods[i].state = [0,"Kein Pfad gesetzt"];
            }
        }
    };

}]);

App.controller('serverController', ['$scope', function ($scope) {
    ipcRenderer.on('to-app', (event, args) => {
        switch (args.type) {
        case "servers-callback":
            $scope.servers = args.data.data;
            $scope.loading = false;
            $scope.$apply();
            for (var i = 0; i < $scope.servers.length; i++) {
                $scope.redrawChart($scope.servers[i]);
                $('#playerScroll' + $scope.servers[i].Id).perfectScrollbar();
            }
            break;
        }
    });

    $scope.redrawChart = function (server) {
        var data = {
            labels: [
                " Zivilisten",
                " Polizisten",
                " Medics",
                " ADAC"
            ],
            datasets: [
                {
                    data: [server.Civilians, server.Cops, server.Medics, server.Adac],
                    backgroundColor: [
                        "#8B008B",
                        "#0000CD",
                        "#228B22",
                        "#C00100"
                    ]
                }]
        };

        var xhx = $("#serverChart" + server.Id);
        new Chart(xhx, {
            type: 'pie',
            data: data,
            options: {
                responsive: false,
                legend: {
                    position: 'bottom'
                }
            }
        });
    };

    $scope.init = function () {
        $scope.loading = true;
        getServers();
    };

    $scope.showTab = function (tabindex) {
        $('.serverTab').removeClass('active');
        $('.serverPane').removeClass('active');
        $('#serverTab' + tabindex).addClass('active');
        $('#serverPane' + tabindex).addClass('active');
    };
}]);

App.controller('changelogController', ['$scope', function ($scope) {
    ipcRenderer.on('to-app', (event, args) => {
            switch (args.type) {
            case "changelog-callback":
                $scope.changelogs = args.data.data;
                $scope.loading = false;
                $scope.$apply();
                $('#changelogScroll').perfectScrollbar({wheelSpeed: 0.5});
                break;
            }
    });

    $scope.init = function () {
        $scope.loading = true;
        getChangelog();
    };
}]);

App.controller('settingsController', ['$scope','$rootScope', function ($scope,$rootScope) {
    $scope.init = function () {
        storage.get('settings', function(error, data) {
            if (error) throw error;
            $rootScope.ArmaPath = data.armapath;
        });
    };

    $scope.chooseArmaPath = function () {
        var options = {
            filters: [{
                name: 'Arma3.exe',
                extensions: ['exe']
            }],
            title: "Bitte wähle deine Arma3.exe aus",
            properties: ['openFile']
        };
        path = String(dialog.showOpenDialog(options));
        if (path !== "undefined" && path.indexOf('\\arma3.exe') > -1) {
            console.log($rootScope.ArmaPath = path.replace('arma3.exe', ''));
        } else {
            $rootScope.ArmaPath = '';
        }
    };
}]);

function getMods() {
    var args = {
        type: "get-url",
        callback: "mod-callback",
        url: APIBaseURL + APIModsURL,
        callBackTarget: "to-app"
    };
    ipcRenderer.send('to-web', args);
}

function getChangelog() {
    var args = {
        type: "get-url",
        callback: "changelog-callback",
        url: APIBaseURL + APIChangelogURL,
        callBackTarget: "to-app"
    };
    ipcRenderer.send('to-web', args);
}

function getServers() {
    var args = {
        type: "get-url",
        callback: "servers-callback",
        url: APIBaseURL + APIServersURL,
        callBackTarget: "to-app"
    };
    ipcRenderer.send('to-web', args);
}
