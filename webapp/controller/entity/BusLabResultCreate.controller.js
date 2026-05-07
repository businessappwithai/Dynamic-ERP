/**
 * BusLabResult Create Controller
 *
 * Handles creation of new Bus Lab Result records.
 * Form fields generated from sys_field metadata.
 *
 * Generated: 2026-03-09T11:47:10.459Z
 */
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(Controller, JSONModel, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("hospital-management-system.controller.entity.BusLabResultCreate", {

    onInit: function() {
      var oViewModel = new JSONModel({
        busy: false,
        entityName: "bus_lab_result",
        entityDisplayName: "Bus Lab Result",
        entitySetName: "LabResultSet",
        formData: {}
      });
      this.getView().setModel(oViewModel, "view");

      this._getRouter()
        .getRoute("busLabResultCreateRoute")
        .attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function() {
      // Reset form data
      this.getView().getModel("view").setProperty("/formData", {
        test_date: "",
        test_name: "",
        test_value: "",
        reference_range: "",
        is_abnormal: false,
        performed_by: "",
        notes: "",
      });
    },

    onSavePress: function() {
      var oView = this.getView();
      var oViewModel = oView.getModel("view");
      var oFormData = oViewModel.getProperty("/formData");
      var sEntitySet = oViewModel.getProperty("/entitySetName");

      // Basic validation
      if (!oFormData.test_date && oFormData.test_date !== 0 && oFormData.test_date !== false) {
        MessageBox.error("Test Date is required");
        return;
      }
      if (!oFormData.test_name && oFormData.test_name !== 0 && oFormData.test_name !== false) {
        MessageBox.error("Test Name is required");
        return;
      }
      if (!oFormData.test_value && oFormData.test_value !== 0 && oFormData.test_value !== false) {
        MessageBox.error("Test Value is required");
        return;
      }
      if (!oFormData.reference_range && oFormData.reference_range !== 0 && oFormData.reference_range !== false) {
        MessageBox.error("Reference Range is required");
        return;
      }
      if (!oFormData.is_abnormal && oFormData.is_abnormal !== 0 && oFormData.is_abnormal !== false) {
        MessageBox.error("Is Abnormal is required");
        return;
      }
      if (!oFormData.performed_by && oFormData.performed_by !== 0 && oFormData.performed_by !== false) {
        MessageBox.error("Performed By is required");
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
        MessageToast.show("Bus Lab Result created successfully");
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
      var oRouter = this._getRouter(); if (oRouter) { oRouter.navTo("busLabResultListRoute"); };
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
