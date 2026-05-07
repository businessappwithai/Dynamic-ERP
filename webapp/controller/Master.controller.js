sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator"
], function(Controller, JSONModel, Filter, FilterOperator) {
  "use strict";

  var ENTITIES = [
    { name: "Patients",            description: "Patient records",          route: "busPatientListRoute" },
    { name: "Staff",               description: "Hospital staff",           route: "busStaffListRoute" },
    { name: "Departments",         description: "Hospital departments",     route: "busDepartmentListRoute" },
    { name: "Insurance Providers", description: "Insurance providers",      route: "busInsuranceProviderListRoute" },
    { name: "Appointments",        description: "Patient appointments",     route: "busAppointmentListRoute" },
    { name: "Admissions",          description: "Patient admissions",       route: "busAdmissionListRoute" },
    { name: "Encounters",          description: "Clinical encounters",      route: "busEncounterListRoute" },
    { name: "Diagnoses",           description: "Patient diagnoses",        route: "busDiagnosisListRoute" },
    { name: "Prescriptions",       description: "Medication prescriptions", route: "busPrescriptionListRoute" },
    { name: "Lab Orders",          description: "Laboratory orders",        route: "busLabOrderListRoute" },
    { name: "Lab Results",         description: "Laboratory results",       route: "busLabResultListRoute" },
    { name: "Vital Signs",         description: "Patient vital signs",      route: "busVitalSignListRoute" },
    { name: "Bills",               description: "Patient billing",          route: "busBillListRoute" }
  ];

  return Controller.extend("hospital-management-system.controller.Master", {

    onInit: function() {
      var oModel = new JSONModel({ entities: ENTITIES });
      this.getView().setModel(oModel);
    },

    onEntitySearch: function(oEvent) {
      var sQuery = oEvent.getParameter("newValue") || "";
      var oList = this.byId("entityList");
      var oBinding = oList.getBinding("items");
      if (sQuery) {
        oBinding.filter([new Filter("name", FilterOperator.Contains, sQuery)]);
      } else {
        oBinding.filter([]);
      }
    },

    onEntitySelect: function(oEvent) {
      var oItem = oEvent.getParameter("listItem");
      var oCtx = oItem.getBindingContext();
      var sRoute = oCtx.getProperty("route");
      this.getOwnerComponent().getRouter().navTo(sRoute);
    },

    onAdminPress: function() {
      this.getOwnerComponent().getRouter().navTo("admin");
    }

  });
});
