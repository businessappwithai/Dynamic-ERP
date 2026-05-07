/**
 * BusPrescription Create Controller
 *
 * Handles creation of new Bus Prescription records.
 * Form fields generated from sys_field metadata.
 *
 * Generated: 2026-03-09T11:47:10.457Z
 */
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(Controller, JSONModel, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("hospital-management-system.controller.entity.BusPrescriptionCreate", {

    onInit: function() {
      var oViewModel = new JSONModel({
        busy: false,
        entityName: "bus_prescription",
        entityDisplayName: "Bus Prescription",
        entitySetName: "PrescriptionSet",
        formData: {}
      });
      this.getView().setModel(oViewModel, "view");

      this._getRouter()
        .getRoute("busPrescriptionCreateRoute")
        .attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function() {
      // Reset form data
      this.getView().getModel("view").setProperty("/formData", {
        prescribed_date: "",
        prescribed_by: "",
        dosage: "",
        frequency: "",
        route: "",
        duration_days: 0,
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
      if (!oFormData.prescribed_date && oFormData.prescribed_date !== 0 && oFormData.prescribed_date !== false) {
        MessageBox.error("Prescribed Date is required");
        return;
      }
      if (!oFormData.prescribed_by && oFormData.prescribed_by !== 0 && oFormData.prescribed_by !== false) {
        MessageBox.error("Prescribed By is required");
        return;
      }
      if (!oFormData.dosage && oFormData.dosage !== 0 && oFormData.dosage !== false) {
        MessageBox.error("Dosage is required");
        return;
      }
      if (!oFormData.frequency && oFormData.frequency !== 0 && oFormData.frequency !== false) {
        MessageBox.error("Frequency is required");
        return;
      }
      if (!oFormData.route && oFormData.route !== 0 && oFormData.route !== false) {
        MessageBox.error("Route is required");
        return;
      }
      if (!oFormData.duration_days && oFormData.duration_days !== 0 && oFormData.duration_days !== false) {
        MessageBox.error("Duration Days is required");
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
        MessageToast.show("Bus Prescription created successfully");
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
      var oRouter = this._getRouter(); if (oRouter) { oRouter.navTo("busPrescriptionListRoute"); };
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
