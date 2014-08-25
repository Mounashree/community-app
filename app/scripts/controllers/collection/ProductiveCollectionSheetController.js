'use strict';

(function (module) {
    mifosX.controllers = _.extend(module, {
        ProductiveCollectionSheetController: function (scope, routeParams, rootScope, resourceFactory, dateFilter, location) {
            var params = {};
            params.locale = "en";
            params.dateFormat = scope.df;
            params.meetingDate = routeParams.meetingDate;
            params.officeId = routeParams.officeId;
            params.staffId = routeParams.staffId;
            if (params.staffId === "undefined") {
                params.staffId = null;
            }
            var centerIdArray = [];
            scope.submitNextShow = true;
            scope.submitShow = false;
            scope.completedCenter = false;
            scope.officeName = routeParams.officeName;
            scope.meetingDate = routeParams.meetingDate;
            var submittedStaffId = [];
            scope.details = false;
            scope.savingsGroupsTotal = [];
            scope.date = {};
            scope.date.transactionDate = new Date();

            resourceFactory.centerResource.getAllMeetingFallCenters(params, function (data) {
                if (data[0]) {
                    scope.staffCenterData = data[0].meetingFallCenters;
                    for (var i = 0; i < scope.staffCenterData.length; i++) {
                        centerIdArray.push({id: scope.staffCenterData[i].id, calendarId: scope.staffCenterData[i].collectionMeetingCalendar.id});
                    }
                    scope.getAllGroupsByCenter(data[0].meetingFallCenters[0].id, data[0].meetingFallCenters[0].collectionMeetingCalendar.id);
                }
            });

            scope.getAllGroupsByCenter = function (centerId, calendarId) {
                scope.submitNextShow = true;
                scope.submitShow = false;
                if (centerIdArray.length-1 === submittedStaffId.length || centerIdArray.length === 1) {
                    scope.submitNextShow = false;
                    scope.submitShow = true;
                }
                scope.selectedTab = centerId;
                scope.centerId = centerId;
                scope.calendarId = calendarId;
                scope.formData = {};
                scope.formData.dateFormat = scope.df;
                scope.formData.locale = "en";
                scope.formData.calendarId = scope.calendarId;
                scope.formData.transactionDate = routeParams.meetingDate;

                console.log(routeParams.meetingDate);

                for (var i = 0; i < submittedStaffId.length; i++) {
                    if (centerId == submittedStaffId[i].id) {
                        scope.submitNextShow = false;
                        scope.submitShow = false;
                        break;
                    }
                }
				
				rootScope.blockUI = true;
                resourceFactory.centerResource.save({'centerId': scope.centerId, command: 'generateCollectionSheet'}, scope.formData, function (data) {
					rootScope.blockUI = false;
                    scope.collectionsheetdata = data;
                    scope.clientsAttendanceArray(data.groups);
                    scope.savingsgroups = data.groups;
                    scope.recalculate();

                });
            };


            /**
             * Sum of loans and savings due for collection group by currency
             */
            scope.recalculate = function () {
                scope.totalDueCollection = [];
                scope.sumGroupCollection();
                scope.sumSavingsDueCollection();
                scope.sumSavingsWithdrawal();
                scope.sumLoansTotal();
				scope.sumLoansDisbursementTotal();
                scope.sumLoansDueByCurrency();
                scope.sumSavingsDueByCurrency();
				scope.sumTotal();
            };

            scope.sumLoansDueByCurrency = function () {
                _.each(scope.loansTotal, function (loan) {
                    var existing = _.findWhere(scope.totalDueCollection, {currencyCode: loan.currencyCode});
                    var dueAmount = loan.dueAmount;
                    if (isNaN(dueAmount)) {
                        dueAmount = parseInt(0);
                    }
                    if (existing === 'undefined' || !(_.isObject(existing))) {
                        var gp = {
                            currencyCode: loan.currencyCode,
                            currencySymbol: loan.currencySymbol,
                            dueAmount: dueAmount
                        };
                        scope.totalDueCollection.push(gp);
                    } else {
                        existing.dueAmount = Math.ceil((Number(existing.dueAmount) + Number(dueAmount)) * 100) / 100;
                    }
                });
            };

            scope.sumSavingsDueByCurrency = function () {
                _.each(scope.savingsTotal, function (saving) {
                    var existing = _.findWhere(scope.totalDueCollection, {currencyCode: saving.currencyCode});
                    var dueAmount = saving.dueAmount;
                    if (isNaN(dueAmount)) {
                        dueAmount = parseInt(0);
                    }
                    if (existing === 'undefined' || !(_.isObject(existing))) {
                        var gp = {
                            currencyCode: saving.currencyCode,
                            currencySymbol: saving.currencySymbol,
                            dueAmount: dueAmount
                        };
                        scope.totalDueCollection.push(gp);
                    } else {
                        existing.dueAmount = Math.ceil((Number(existing.dueAmount) + Number(dueAmount)) * 100) / 100;
                    }
                });
            };

            /**
             * Sum of loan dues, Savings dues and Savings/Mandatory Savings withdrawals group by group and product
             */
            scope.sumGroupCollection = function () {
                scope.savingsGroupsTotal = [];
                scope.savingsWithdrawalGroupsTotal = [];
                scope.loanGroupsTotal = [];
				scope.loanDisbursementGroupsTotal = [];
                _.each(scope.savingsgroups, function (group) {
                        _.each(group.clients, function (client) {
                            _.each(client.savings, function (saving) {
                                scope.sumGroupSavingsDueCollection(group, saving);
                                scope.sumGroupSavingsWithdrawalCollection(group, saving);
                            });
                            _.each(client.loans, function (loan) {
                                scope.sumGroupLoansDueCollection(group, loan);
								scope.sumGroupLoansDisbursementCollection(group, loan);
                            });
                        });
                    }
                );
            };

            /**
             * Sum of savings dues group by group id and savings product id
             * @param group
             * @param saving
             */
            scope.sumGroupSavingsDueCollection = function (group, saving) {
                var existing = _.findWhere(scope.savingsGroupsTotal, {groupId: group.groupId, productId: saving.productId});
                var dueAmount = saving.dueAmount;
                if (isNaN(dueAmount)) {
                    dueAmount = parseInt(0);
                }
                if (existing === 'undefined' || !(_.isObject(existing))) {
                    var gp = {
                        groupId: group.groupId,
                        productId: saving.productId,
                        dueAmount: dueAmount,
                        currencyCode: saving.currency.code,
                        currencySymbol: saving.currency.displaySymbol
                    };
                    scope.savingsGroupsTotal.push(gp);
                } else {
                    existing.dueAmount = Math.ceil((Number(existing.dueAmount) + Number(dueAmount)) * 100) / 100;
                }
            };
            
            /**
             * Sum of savings withdrawals group by group id and savings product id
             * @param group
             * @param saving
             */
            scope.sumGroupSavingsWithdrawalCollection = function (group, saving) {
                var existing = _.findWhere(scope.savingsWithdrawalGroupsTotal, {groupId: group.groupId, productId: saving.productId});
                var withdrawalAmount = saving.withdrawalAmount;
                if (isNaN(withdrawalAmount)) {
                    withdrawalAmount = parseInt(0);
                }
                if (existing === 'undefined' || !(_.isObject(existing))) {
                    var gp = {
                        groupId: group.groupId,
                        productId: saving.productId,
                        withdrawalAmount: withdrawalAmount,
                        currencyCode: saving.currency.code,
                        currencySymbol: saving.currency.displaySymbol
                    };
                    scope.savingsWithdrawalGroupsTotal.push(gp);
                } else {
                    existing.withdrawalAmount = Math.ceil((Number(existing.withdrawalAmount) + Number(withdrawalAmount)) * 100) / 100;
                }
            };

            /**
             * Sum of loans dues group by group id and loan product id
             * @param group
             * @param loan
             */
            scope.sumGroupLoansDueCollection = function (group, loan) {
                var existing = _.findWhere(scope.loanGroupsTotal, {groupId: group.groupId, productId: loan.productId});
                //alert(_.isObject(existing));
                var totalDue = scope.getLoanTotalDueAmount(loan);
                if (existing === 'undefined' || !(_.isObject(existing))) {
                    var gp = {
                        groupId: group.groupId,
                        productId: loan.productId,
                        dueAmount: totalDue,
                        //chargesDue: loan['chargesDue'],
                        currencyCode: loan.currency.code,
                        currencySymbol: loan.currency.displaySymbol
                    };
                    scope.loanGroupsTotal.push(gp);
                } else {
                    existing.dueAmount = Math.ceil((Number(existing.dueAmount) + Number(totalDue)) * 100) / 100;
                }
            };
			
			/**
             * Sum of loans disbursement group by group id and loan product id
             * @param group
             * @param loan
             */
            scope.sumGroupLoansDisbursementCollection = function (group, loan) {
                var existing = _.findWhere(scope.loanDisbursementGroupsTotal, {groupId: group.groupId, productId: loan.productId});
                //alert(_.isObject(existing));
                var totalDisbursement = loan.disbursementAmount;
                if (existing === 'undefined' || !(_.isObject(existing))) {
                    var gp = {
                        groupId: group.groupId,
                        productId: loan.productId,
                        disbursementAmount: totalDisbursement,
                        currencyCode: loan.currency.code,
                        currencySymbol: loan.currency.displaySymbol
                    };
                    scope.loanDisbursementGroupsTotal.push(gp);
                } else {
                    existing.disbursementAmount = Math.ceil((Number(existing.disbursementAmount) + Number(totalDisbursement)) * 100) / 100;
                }
            };

            scope.getLoanTotalDueAmount = function(loan){
                var principalInterestDue = loan.totalDue;
                var chargesDue = loan.chargesDue;
                if (isNaN(principalInterestDue)) {
                    principalInterestDue = parseInt(0);
                }
                if (isNaN(chargesDue)) {
                    chargesDue = parseInt(0);
                }
                return Math.ceil((Number(principalInterestDue) + Number(chargesDue)) * 100) / 100;
            };
            /**
             * Sum of savings dues across all groups group by savings product id
             */
            scope.sumSavingsDueCollection = function () {
                scope.savingsTotal = [];
                _.each(scope.savingsGroupsTotal, function (group) {
                    var dueAmount = group.dueAmount;
                    if (isNaN(dueAmount)) {
                        dueAmount = parseInt(0);
                    }

                    var existing = _.findWhere(scope.savingsTotal, {productId: group.productId});
                    if (existing === 'undefined' || !(_.isObject(existing))) {
                        var gp = {
                            productId: group.productId,
                            currencyCode: group.currencyCode,
                            currencySymbol: group.currencySymbol,
                            dueAmount: dueAmount
                        };
                        scope.savingsTotal.push(gp);
                    } else {
                        existing.dueAmount = Math.ceil((Number(existing.dueAmount) + Number(dueAmount)) * 100) / 100;
                    }
                });
            };
            
            /**
             * Sum of savings withdrawals across all groups group by savings product id
             */
            scope.sumSavingsWithdrawal = function () {
                scope.savingsWithdrawalTotal = [];
                _.each(scope.savingsWithdrawalGroupsTotal, function (group) {
                    var withdrawalAmount = group.withdrawalAmount;
                    if (isNaN(withdrawalAmount)) {
                        withdrawalAmount = parseInt(0);
                    }
                    var existing = _.findWhere(scope.savingsWithdrawalTotal, {productId: group.productId});
                    if (existing === 'undefined' || !(_.isObject(existing))) {
                        var gp = {
                            productId: group.productId,
                            currencyCode: group.currencyCode,
                            currencySymbol: group.currencySymbol,
                            withdrawalAmount: withdrawalAmount
                        };
                        scope.savingsWithdrawalTotal.push(gp);
                    } else {
                        existing.withdrawalAmount = Math.ceil((Number(existing.withdrawalAmount) + Number(withdrawalAmount)) * 100) / 100;
                    }
                });
            };

            /**
             * Sum of loans dues across all groups group by loan product id
             */
            scope.sumLoansTotal = function () {
                scope.loansTotal = [];
                _.each(scope.loanGroupsTotal, function (group) {
                    var dueAmount = group.dueAmount;
                    if (isNaN(dueAmount)) {
                        dueAmount = parseInt(0);
                    }
                    var existing = _.findWhere(scope.loansTotal, {productId: group.productId});
                    if (existing === 'undefined' || !(_.isObject(existing))) {
                        var gp = {
                            productId: group.productId,
                            currencyCode: group.currencyCode,
                            currencySymbol: group.currencySymbol,
                            dueAmount: dueAmount
                        };
                        scope.loansTotal.push(gp);
                    } else {
                        existing.dueAmount = Math.ceil((Number(existing.dueAmount) + Number(dueAmount)) * 100) / 100;
                    }
                });
            };
			
			/**
             * Sum of loans disbursements across all groups group by loan product id
             */
            scope.sumLoansDisbursementTotal = function () {
                scope.loansDisbursementTotal = [];
                _.each(scope.loanDisbursementGroupsTotal, function (group) {
                    var disbursementAmount = group.disbursementAmount;
                    if (isNaN(disbursementAmount)) {
                        disbursementAmount = parseInt(0);
                    }
                    var existing = _.findWhere(scope.loansDisbursementTotal, {productId: group.productId});
                    if (existing === 'undefined' || !(_.isObject(existing))) {
                        var gp = {
                            productId: group.productId,
                            currencyCode: group.currencyCode,
                            currencySymbol: group.currencySymbol,
                            disbursementAmount: disbursementAmount
                        };
                        scope.loansDisbursementTotal.push(gp);
                    } else {
                        existing.disbursementAmount = Math.ceil((Number(existing.disbursementAmount) + Number(disbursementAmount)) * 100) / 100;
                    }
                });
            };
			
			scope.sumTotal = function() {
				scope.totalreceipts = 0;
				scope.totalpayouts = 0;
				scope.netcash = 0;
				_.each(scope.loansTotal, function (product) {
					var productSum = product.dueAmount;
					scope.totalreceipts += productSum;
				});
				_.each(scope.savingsTotal, function (product) {
					var productSum = product.dueAmount;
					scope.totalreceipts += productSum;
				});
				
				_.each(scope.loansDisbursementTotal, function (product) {
					var productSum = product.disbursementAmount;
					scope.totalpayouts += productSum;
				});
				_.each(scope.savingsWithdrawalTotal, function (product) {
					var productSum = product.withdrawalAmount;
					scope.totalpayouts += productSum;
				});
				
				scope.netcash = scope.totalreceipts - scope.totalpayouts;
			};


            scope.clientsAttendanceArray = function (groups) {
                var gl = groups.length;
                for (var i = 0; i < gl; i++) {
                    scope.clients = groups[i].clients;
                    var cl = scope.clients.length;
                    for (var j = 0; j < cl; j++) {
                        scope.client = scope.clients[j];
                        if (scope.client.attendanceType.id === 0) {
                            scope.client.attendanceType.id = 1;
                        }
                    }
                }
            };

            scope.constructBulkTransactions = function(){
                scope.bulkRepaymentTransactions = [];
                scope.bulkSavingsDueTransactions = [];
                scope.bulkSavingsWithdrawalTransactions = [];
                scope.bulkDisbursementTransactions = [];

                _.each(scope.savingsgroups, function (group) {
                        _.each(group.clients, function (client) {
                            _.each(client.savings, function (saving) {
                                var dueAmount = saving.dueAmount;
                                if (isNaN(dueAmount)) {
                                    dueAmount = parseInt(0);
                                }
                                var savingsDepositTransaction = {
                                    savingsId:saving.savingsId,
                                    transactionAmount:dueAmount
                                };
                                scope.bulkSavingsDueTransactions.push(savingsDepositTransaction);
                                var withdrawalAmount = saving.withdrawalAmount;
                                if (isNaN(withdrawalAmount)) {
                                    withdrawalAmount = parseInt(0);
                                }
                                var savingsWithdrawalTransaction = {
                                    savingsId:saving.savingsId,
                                    transactionAmount:withdrawalAmount
                                };
                                scope.bulkSavingsWithdrawalTransactions.push(savingsWithdrawalTransaction);
                            });

                            _.each(client.loans, function (loan) {

                                if(loan.accountStatusId === 300){
                                    var totalDue = scope.getLoanTotalDueAmount(loan);
                                    var loanTransaction = {
                                        loanId:loan.loanId,
                                        transactionAmount:totalDue
                                    };
                                    scope.bulkRepaymentTransactions.push(loanTransaction);
                                }


                                if(loan.accountStatusId === 200){
                                    var loanTransaction = {
                                        loanId:loan.loanId,
                                        transactionAmount:loan.disbursementAmount
                                    };
                                    scope.bulkDisbursementTransactions.push(loanTransaction);
                                }

                            });
                        });
                    }
                );
            };

            scope.submit = function () {


                rootScope.blockUI = true;

                console.log("rootScope.blockUI: " + rootScope.blockUI);

                scope.formData.calendarId = scope.calendarId;
                scope.formData.dateFormat = scope.df;
                scope.formData.locale = scope.optlang.code;

                if (scope.date.transactionDate) {
                    scope.formData.transactionDate = dateFilter(scope.formData.transactionDate, scope.df);
                }

                scope.formData.actualDisbursementDate = this.formData.transactionDate;
                scope.formData.clientsAttendance = scope.clientsAttendance;

                //construct loan repayment and savings due transactions
                scope.constructBulkTransactions();
                scope.formData.bulkRepaymentTransactions = scope.bulkRepaymentTransactions;
                scope.formData.bulkDisbursementTransactions = scope.bulkDisbursementTransactions;
                scope.formData.bulkSavingsDueTransactions = scope.bulkSavingsDueTransactions;
                scope.formData.bulkSavingsWithdrawalTransactions = scope.bulkSavingsWithdrawalTransactions;

                rootScope.blockUI = true;

                resourceFactory.centerResource.save(
                    {'centerId': scope.centerId, command: 'saveCollectionSheet'}, 
                    scope.formData, 
                    function (data) {
                                        // localStorageService.add('Success', true);
                                        // route.reload();
                                        for (var i = 0; i < centerIdArray.length; i++) {
                                            if (scope.centerId === centerIdArray[i].id && centerIdArray.length >= 1) {
                                                    scope.staffCenterData[i].submitted = true;
                                                    submittedStaffId.push({id: scope.staffCenterData[i].id});
                                            }
                                        }

                                        if (centerIdArray.length === submittedStaffId.length) {
                                            location.path('/entercollectionsheet');
                                        }

                                        if (centerIdArray.length-1 === submittedStaffId.length) {
                                            scope.submitNextShow = false;
                                            scope.submitShow = true;
                                        }

                                        for (var i = 0; i < centerIdArray.length; i++) {
                                            if (!scope.staffCenterData[i].submitted) {
                                            scope.getAllGroupsByCenter(scope.staffCenterData[i].id, scope.staffCenterData[i].collectionMeetingCalendar.id);
                                            break;
                                            }
                                        }

                    }
                );

            };


        }
    });
    mifosX.ng.application.controller('ProductiveCollectionSheetController', ['$scope', '$routeParams', '$rootScope', 'ResourceFactory', 'dateFilter', '$location', mifosX.controllers.ProductiveCollectionSheetController]).run(function ($log) {
        $log.info("ProductiveCollectionSheetController initialized");
    });
}(mifosX.controllers || {}));
