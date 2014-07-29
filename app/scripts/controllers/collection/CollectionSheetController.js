'use strict';
/*global _ */
/*global mifosX */

(function (module) {
    mifosX.controllers = _.extend(module, {
        CollectionSheetController: function (scope, resourceFactory, location, routeParams, dateFilter, localStorageService, route, $timeout) {

            scope.offices = [];
            scope.centers = [];
            scope.groups = [];
            scope.date = {};
			scope.date.transactionDate = new Date();

            resourceFactory.officeResource.getAllOffices(function (data) {
                scope.offices = data;
            });

            scope.officeSelected = function (officeId) {
                scope.officeId = officeId;
                if (officeId) {
                    resourceFactory.employeeResource.getAllEmployees({officeId: officeId}, function (data) {
                        scope.loanOfficers = data;
                    });
                }
            };

            scope.loanOfficerSelected = function (loanOfficerId) {
                if (loanOfficerId) {
                    resourceFactory.centerResource.getAllCenters({officeId: scope.officeId, staffId: loanOfficerId, orderBy: 'name', sortOrder: 'ASC', limit: -1}, function (data) {
                        scope.centers = data;
                    });
                } else {
                    scope.centers = '';
                 //   scope.groups = '';
                }
            };

            scope.productiveCollectionSheet = function () {
                for (var i = 0; i < scope.offices.length; i++) {
                    if (scope.offices[i].id === scope.officeId) {
                        scope.officeName = scope.offices[i].name;
                    }
                }
                scope.meetingDate = dateFilter(scope.date.transactionDate, scope.df);
                location.path('/productivesheet/' + scope.officeId + '/' + scope.officeName + '/' + scope.meetingDate + '/' + scope.loanOfficerId);
            };

        }
    });


    mifosX.ng.application.controller('CollectionSheetController', ['$scope', 'ResourceFactory', '$location', '$routeParams', 'dateFilter', 'localStorageService',
            '$route', '$timeout', mifosX.controllers.CollectionSheetController]).run(function ($log) {
            $log.info("CollectionSheetController initialized");
        });
}
    
    (mifosX.controllers || {})
);
