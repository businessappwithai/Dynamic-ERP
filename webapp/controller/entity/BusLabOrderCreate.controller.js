/**
 * BusLabOrder Create Controller
 *
 * Handles creation of new Bus Lab Order records.
 * Form fields generated from sys_field metadata.
 *
 * Generated: 2026-03-09T11:47:10.458Z
 */
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(Controller, JSONModel, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("hospital-management-system.controller.entity.BusLabOrderCreate", {

    onInit: function() {
      var oViewModel = new JSONModel({
        busy: false,
        entityName: "bus_lab_order",
        entityDisplayName: "Bus Lab Order",
        entitySetName: "LabOrderSet",
        formData: {}
      });
      this.getView().setModel(oViewModel, "view");

      this._getRouter()
        .getRoute("busLabOrderCreateRoute")
        .attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function() {
      // Reset form data
      this.getView().getModel("view").setProperty("/formData", {
        ordered_date: "",
        ordered_by: "",
        test_type: "",
        priority: "",
        status: "",
        clinical_indication: "",
        notes: "",
      });
    },

    onSavePress: function() {
      var oView = this.getView();
      var oViewModel = oView.getModel("view");
      var oFormData = oViewModel.getProperty("/formData");
      var sEntitySet = oViewModel.getProperty("/entitySetName");

      // Basic validation
      if (!oFormData.ordered_date && oFormData.ordered_date !== 0 && oFormData.ordered_date !== false) {
        MessageBox.error("Ordered Date is required");
        return;
      }
      if (!oFormData.ordered_by && oFormData.ordered_by !== 0 && oFormData.ordered_by !== false) {
        MessageBox.error("Ordered By is required");
        return;
      }
      if (!oFormData.test_type && oFormData.test_type !== 0 && oFormData.test_type !== false) {
        MessageBox.error("Test Type is required");
        return;
      }
      if (!oFormData.priority && oFormData.priority !== 0 && oFormData.priority !== false) {
        MessageBox.error("Priority is required");
        return;
      }
      if (!oFormData.status && oFormData.status !== 0 && oFormData.status !== false) {
        MessageBox.error("Status is required");
        return;
      }
      if (!oFormData.clinical_indication && oFormData.clinical_indication !== 0 && oFormData.clinical_indication !== false) {
        MessageBox.error("Clinical Indication is required");
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
        MessageToast.show("Bus Lab Order created successfully");
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
      var oRouter = this._getRouter(); if (oRouter) { oRouter.navTo("busLabOrderListRoute"); };
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
