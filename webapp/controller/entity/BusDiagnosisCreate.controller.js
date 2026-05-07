/**
 * BusDiagnosis Create Controller
 *
 * Handles creation of new Bus Diagnosis records.
 * Form fields generated from sys_field metadata.
 *
 * Generated: 2026-03-09T11:47:10.456Z
 */
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(Controller, JSONModel, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("hospital-management-system.controller.entity.BusDiagnosisCreate", {

    onInit: function() {
      var oViewModel = new JSONModel({
        busy: false,
        entityName: "bus_diagnosis",
        entityDisplayName: "Bus Diagnosis",
        entitySetName: "DiagnosisSet",
        formData: {}
      });
      this.getView().setModel(oViewModel, "view");

      this._getRouter()
        .getRoute("busDiagnosisCreateRoute")
        .attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function() {
      // Reset form data
      this.getView().getModel("view").setProperty("/formData", {
        diagnosis_date: "",
        diagnosis_code: "",
        diagnosis_type: "",
        status: "",
        notes: "",
      });
    },

    onSavePress: function() {
      var oView = this.getView();
      var oViewModel = oView.getModel("view");
      var oFormData = oViewModel.getProperty("/formData");
      var sEntitySet = oViewModel.getProperty("/entitySetName");

      // Basic validation
      if (!oFormData.diagnosis_date && oFormData.diagnosis_date !== 0 && oFormData.diagnosis_date !== false) {
        MessageBox.error("Diagnosis Date is required");
        return;
      }
      if (!oFormData.diagnosis_code && oFormData.diagnosis_code !== 0 && oFormData.diagnosis_code !== false) {
        MessageBox.error("Diagnosis Code is required");
        return;
      }
      if (!oFormData.diagnosis_type && oFormData.diagnosis_type !== 0 && oFormData.diagnosis_type !== false) {
        MessageBox.error("Diagnosis Type is required");
        return;
      }
      if (!oFormData.status && oFormData.status !== 0 && oFormData.status !== false) {
        MessageBox.error("Status is required");
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
        MessageToast.show("Bus Diagnosis created successfully");
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
      var oRouter = this._getRouter(); if (oRouter) { oRouter.navTo("busDiagnosisListRoute"); };
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
