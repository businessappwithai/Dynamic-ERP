/**
 * BusVitalSign Create Controller
 *
 * Handles creation of new Bus Vital Sign records.
 * Form fields generated from sys_field metadata.
 *
 * Generated: 2026-03-09T11:47:10.455Z
 */
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(Controller, JSONModel, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("hospital-management-system.controller.entity.BusVitalSignCreate", {

    onInit: function() {
      var oViewModel = new JSONModel({
        busy: false,
        entityName: "bus_vital_sign",
        entityDisplayName: "Bus Vital Sign",
        entitySetName: "VitalSignSet",
        formData: {}
      });
      this.getView().setModel(oViewModel, "view");

      this._getRouter()
        .getRoute("busVitalSignCreateRoute")
        .attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function() {
      // Reset form data
      this.getView().getModel("view").setProperty("/formData", {
        recorded_date: "",
        recorded_by: "",
        temperature: 0,
        pulse: 0,
        respiration: 0,
        systolic_bp: 0,
        diastolic_bp: 0,
        oxygen_saturation: 0,
        weight: 0,
        height: 0,
        blood_glucose: 0,
        notes: "",
      });
    },

    onSavePress: function() {
      var oView = this.getView();
      var oViewModel = oView.getModel("view");
      var oFormData = oViewModel.getProperty("/formData");
      var sEntitySet = oViewModel.getProperty("/entitySetName");

      // Basic validation
      if (!oFormData.recorded_date && oFormData.recorded_date !== 0 && oFormData.recorded_date !== false) {
        MessageBox.error("Recorded Date is required");
        return;
      }
      if (!oFormData.recorded_by && oFormData.recorded_by !== 0 && oFormData.recorded_by !== false) {
        MessageBox.error("Recorded By is required");
        return;
      }
      if (!oFormData.temperature && oFormData.temperature !== 0 && oFormData.temperature !== false) {
        MessageBox.error("Temperature is required");
        return;
      }
      if (!oFormData.pulse && oFormData.pulse !== 0 && oFormData.pulse !== false) {
        MessageBox.error("Pulse is required");
        return;
      }
      if (!oFormData.respiration && oFormData.respiration !== 0 && oFormData.respiration !== false) {
        MessageBox.error("Respiration is required");
        return;
      }
      if (!oFormData.systolic_bp && oFormData.systolic_bp !== 0 && oFormData.systolic_bp !== false) {
        MessageBox.error("Systolic Bp is required");
        return;
      }
      if (!oFormData.diastolic_bp && oFormData.diastolic_bp !== 0 && oFormData.diastolic_bp !== false) {
        MessageBox.error("Diastolic Bp is required");
        return;
      }
      if (!oFormData.oxygen_saturation && oFormData.oxygen_saturation !== 0 && oFormData.oxygen_saturation !== false) {
        MessageBox.error("Oxygen Saturation is required");
        return;
      }
      if (!oFormData.weight && oFormData.weight !== 0 && oFormData.weight !== false) {
        MessageBox.error("Weight is required");
        return;
      }
      if (!oFormData.height && oFormData.height !== 0 && oFormData.height !== false) {
        MessageBox.error("Height is required");
        return;
      }
      if (!oFormData.blood_glucose && oFormData.blood_glucose !== 0 && oFormData.blood_glucose !== false) {
        MessageBox.error("Blood Glucose is required");
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
        MessageToast.show("Bus Vital Sign created successfully");
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
      var oRouter = this._getRouter(); if (oRouter) { oRouter.navTo("busVitalSignListRoute"); };
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
