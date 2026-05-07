sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/f/library"
], function(Controller, JSONModel, fioriLibrary) {
  "use strict";

  var ENTITIES = [
    { key: "bus_patient",           name: "Patients",           description: "Patient records",           route: "busPatientListRoute" },
    { key: "bus_staff",             name: "Staff",              description: "Hospital staff",            route: "busStaffListRoute" },
    { key: "bus_department",        name: "Departments",        description: "Hospital departments",      route: "busDepartmentListRoute" },
    { key: "bus_insurance_provider",name: "Insurance Providers",description: "Insurance providers",       route: "busInsuranceProviderListRoute" },
    { key: "bus_appointment",       name: "Appointments",       description: "Patient appointments",      route: "busAppointmentListRoute" },
    { key: "bus_admission",         name: "Admissions",         description: "Patient admissions",        route: "busAdmissionListRoute" },
    { key: "bus_encounter",         name: "Encounters",         description: "Clinical encounters",       route: "busEncounterListRoute" },
    { key: "bus_diagnosis",         name: "Diagnoses",          description: "Patient diagnoses",         route: "busDiagnosisListRoute" },
    { key: "bus_prescription",      name: "Prescriptions",      description: "Medication prescriptions",  route: "busPrescriptionListRoute" },
    { key: "bus_lab_order",         name: "Lab Orders",         description: "Laboratory orders",         route: "busLabOrderListRoute" },
    { key: "bus_lab_result",        name: "Lab Results",        description: "Laboratory results",        route: "busLabResultListRoute" },
    { key: "bus_vital_sign",        name: "Vital Signs",        description: "Patient vital signs",       route: "busVitalSignListRoute" },
    { key: "bus_bill",              name: "Bills",              description: "Patient billing",           route: "busBillListRoute" }
  ];

  return Controller.extend("hospital-management-system.controller.EntityMenu", {

    onInit: function() {
      var oModel = new JSONModel({ entityMenu: ENTITIES });
      this.getView().setModel(oModel, "entityMenu");
    },

    onEntitySelect: function(oEvent) {
      var oItem = oEvent.getSource();
      var oCtx = oItem.getBindingContext("entityMenu");
      var sRoute = oCtx.getProperty("route");
      this.getOwnerComponent().getRouter().navTo(sRoute);

      var oAppView = this.getOwnerComponent().getModel("appView");
      if (oAppView) {
        oAppView.setProperty("/layout", fioriLibrary.LayoutType.TwoColumnsMidExpanded);
      }
    }

  });
});
