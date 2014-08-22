(function (module) {
    mifosX.controllers = _.extend(module, {
        AddNewSavingsChargeController: function (scope, resourceFactory, location, routeParams, dateFilter) {
            scope.offices = [];
            scope.cancelRoute = routeParams.id;
            scope.date = {};

            resourceFactory.savingsChargeResource.get({accountId: routeParams.id, resourceType: 'template'}, function (data) {
                scope.chargeOptions = data.chargeOptions;
            });

            scope.chargeSelected = function (id) {
                resourceFactory.chargeResource.get({chargeId: id, template: 'true'}, function (data) {
                    scope.chargeCalculationType = data.chargeCalculationType.id;
                    scope.chargeTimeTypeId = data.chargeTimeType.id;
					scope.chargeTimeType = data.chargeTimeType;
                    scope.chargeDetails = data;
                    scope.formData.amount = data.amount;
					scope.formData.isCalendarInherited = false;
                    scope.withDrawCharge = data.chargeTimeType.value === "Withdrawal Fee" ? true : false;
                    scope.formData.feeInterval = data.feeInterval;
                    if (data.chargeTimeType.value === "Annual Fee" || data.chargeTimeType.value === "Monthly Fee")
                        scope.chargeTimeTypeAnnualOrMonth = true;
                    else
						scope.chargeTimeTypeAnnualOrMonth = false;
					if (data.chargeTimeType.value === "Weekly Fee" || data.chargeTimeType.value === "Monthly Fee")
                        scope.chargeTimeTypeWeeklyOrMonth = true;
                    else
						scope.chargeTimeTypeWeeklyOrMonth = false;
					if (data.chargeTimeType.value === "Weekly Fee" || data.chargeTimeType.value === "Monthly Fee" || data.chargeTimeType.value === "Annual Fee")
                        scope.isRecurringCharge = true;
					else
						scope.isRecurringCharge = false;
                });
            };

            scope.submit = function () {
                this.formData.locale = "en";
                if (scope.withDrawCharge !== true) {
                    if (scope.chargeTimeTypeAnnualOrMonth === true) {
                        this.formData.monthDayFormat = "dd MMMM";
                        if (scope.date.due) {
                            this.formData.feeOnMonthDay = dateFilter(scope.date.due, 'dd MMMM');
                        } else {
                            this.formData.feeOnMonthDay = "";
                        }
                    } else {
                        this.formData.dateFormat = scope.df;
                        if (scope.date.specificduedate) {
                            this.formData.dueDate = dateFilter(scope.date.specificduedate, scope.df);
                        } else {
                            this.formData.dueDate = "";
                        }
                    }
                }
                resourceFactory.savingsChargeResource.save({accountId: routeParams.id}, this.formData, function (data) {
                    location.path('/viewsavingaccount/' + routeParams.id);
                });
            };
        }
    });
    mifosX.ng.application.controller('AddNewSavingsChargeController', ['$scope', 'ResourceFactory', '$location', '$routeParams', 'dateFilter', mifosX.controllers.AddNewSavingsChargeController]).run(function ($log) {
        $log.info("AddNewSavingsChargeController initialized");
    });
}(mifosX.controllers || {}));
