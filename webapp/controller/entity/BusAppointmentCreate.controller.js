/**
 * BusAppointment Create Controller
 *
 * Handles creation of new Bus Appointment records.
 * Form fields generated from sys_field metadata.
 *
 * Generated: 2026-03-09T11:47:10.449Z
 */
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(Controller, JSONModel, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("hospital-management-system.controller.entity.BusAppointmentCreate", {

    onInit: function() {
      var oViewModel = new JSONModel({
        busy: false,
        entityName: "bus_appointment",
        entityDisplayName: "Bus Appointment",
        entitySetName: "AppointmentSet",
        formData: {}
      });
      this.getView().setModel(oViewModel, "view");

      this._getRouter()
        .getRoute("busAppointmentCreateRoute")
        .attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function() {
      // Reset form data
      this.getView().getModel("view").setProperty("/formData", {
        appointment_date: "",
        appointment_time: "",
        duration: 0,
        appointment_type: "",
        status: "",
        reason: "",
        notes: "",
      });
    },

    onSavePress: function() {
      var oView = this.getView();
      var oViewModel = oView.getModel("view");
      var oFormData = oViewModel.getProperty("/formData");
      var sEntitySet = oViewModel.getProperty("/entitySetName");

      // Basic validation
      if (!oFormData.appointment_date && oFormData.appointment_date !== 0 && oFormData.appointment_date !== false) {
        MessageBox.error("Appointment Date is required");
        return;
      }
      if (!oFormData.appointment_time && oFormData.appointment_time !== 0 && oFormData.appointment_time !== false) {
        MessageBox.error("Appointment Time is required");
        return;
      }
      if (!oFormData.duration && oFormData.duration !== 0 && oFormData.duration !== false) {
        MessageBox.error("Duration is required");
        return;
      }
      if (!oFormData.appointment_type && oFormData.appointment_type !== 0 && oFormData.appointment_type !== false) {
        MessageBox.error("Appointment Type is required");
        return;
      }
      if (!oFormData.status && oFormData.status !== 0 && oFormData.status !== false) {
        MessageBox.error("Status is required");
        return;
      }
      if (!oFormData.reason && oFormData.reason !== 0 && oFormData.reason !== false) {
        MessageBox.error("Reason is required");
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
        MessageToast.show("Bus Appointment created successfully");
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
      var oRouter = this._getRouter(); if (oRouter) { oRouter.navTo("busAppointmentListRoute"); };
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
