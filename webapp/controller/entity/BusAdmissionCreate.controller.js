/**
 * BusAdmission Create Controller
 *
 * Handles creation of new Bus Admission records.
 * Form fields generated from sys_field metadata.
 *
 * Generated: 2026-03-09T11:47:10.451Z
 */
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(Controller, JSONModel, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("hospital-management-system.controller.entity.BusAdmissionCreate", {

    onInit: function() {
      var oViewModel = new JSONModel({
        busy: false,
        entityName: "bus_admission",
        entityDisplayName: "Bus Admission",
        entitySetName: "AdmissionSet",
        formData: {}
      });
      this.getView().setModel(oViewModel, "view");

      this._getRouter()
        .getRoute("busAdmissionCreateRoute")
        .attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function() {
      // Reset form data
      this.getView().getModel("view").setProperty("/formData", {
        admission_date: "",
        discharge_date: "",
        admission_type: "",
        status: "",
        primary_diagnosis: "",
        secondary_diagnosis: "",
        notes: "",
      });
    },

    onSavePress: function() {
      var oView = this.getView();
      var oViewModel = oView.getModel("view");
      var oFormData = oViewModel.getProperty("/formData");
      var sEntitySet = oViewModel.getProperty("/entitySetName");

      // Basic validation
      if (!oFormData.admission_date && oFormData.admission_date !== 0 && oFormData.admission_date !== false) {
        MessageBox.error("Admission Date is required");
        return;
      }
      if (!oFormData.discharge_date && oFormData.discharge_date !== 0 && oFormData.discharge_date !== false) {
        MessageBox.error("Discharge Date is required");
        return;
      }
      if (!oFormData.admission_type && oFormData.admission_type !== 0 && oFormData.admission_type !== false) {
        MessageBox.error("Admission Type is required");
        return;
      }
      if (!oFormData.status && oFormData.status !== 0 && oFormData.status !== false) {
        MessageBox.error("Status is required");
        return;
      }
      if (!oFormData.primary_diagnosis && oFormData.primary_diagnosis !== 0 && oFormData.primary_diagnosis !== false) {
        MessageBox.error("Primary Diagnosis is required");
        return;
      }
      if (!oFormData.secondary_diagnosis && oFormData.secondary_diagnosis !== 0 && oFormData.secondary_diagnosis !== false) {
        MessageBox.error("Secondary Diagnosis is required");
        return;
      }
      if (!oFormData.notes && oFormData.notes !== 0 && oFormData.notes !== false) {
        MessageBox.error("Notes is required");
        return;
      }

      oViewModel.setProperty("/busy", true);

      var oModel = this.getOwnerComponent().getModel();
      var oListBinding = oModel.bindList("/" + sEntitySet);
      var oContext = oListBinding.create(oFormData);

      oContext.created().then(function() {
        oViewModel.setProperty("/busy", false);
        MessageToast.show("Bus Admission created successfully");
        this.onNavBack();
      }.bind(this)).catch(function(oError) {
        oViewModel.setProperty("/busy", false);
        MessageBox.error("Failed to create: " + (oError.message || "Unknown error"));
      });
    },

    onCancelPress: function() {
      this.onNavBack();
    },

    onNavBack: function() {
      var oRouter = this._getRouter(); if (oRouter) { oRouter.navTo("busAdmissionListRoute"); };
    },
    _getRouter: function() {
      var oComponent = this.getOwnerComponent();
      if (!oComponent) {
        console.error("Owner component not available in " + this.getMetadata().getName());
        MessageToast.show("Navigation not available");
        return null;
      }
      return oComponent.getRouter();
    },
  });
});
