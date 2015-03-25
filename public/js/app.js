(function() {

    var socket = io.connect();
    //var activateButton = $("#activate");

    socket.on('laser', function (data) {
        console.log(data);
    });

    var app = angular.module("app", []);
    app.controller("AppCtrl", function($scope, $http) {
        $scope.activated = false;
        $scope.status = "Not sure";
        socket.on('access', function (data) {
            if (data == "awaiting access"){
                $scope.activated = false;
            } else if (data == "access granted") {
                $scope.activated = true;
            }
            $scope.$apply();
        });

        socket.on('status', function (data) {
            $scope.status = data.name;
            $scope.$apply();
        });

        $scope.activate = function() {
            $http.post("/api/activate");
        };

        $scope.name = "Laser";
    });
})();