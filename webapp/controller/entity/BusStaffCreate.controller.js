/**
 * BusStaff Create Controller
 *
 * Handles creation of new Bus Staff records.
 * Form fields generated from sys_field metadata.
 *
 * Generated: 2026-03-09T11:47:10.452Z
 */
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(Controller, JSONModel, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("hospital-management-system.controller.entity.BusStaffCreate", {

    onInit: function() {
      var oViewModel = new JSONModel({
        busy: false,
        entityName: "bus_staff",
        entityDisplayName: "Bus Staff",
        entitySetName: "StaffSet",
        formData: {}
      });
      this.getView().setModel(oViewModel, "view");

      this._getRouter()
        .getRoute("busStaffCreateRoute")
        .attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function() {
      // Reset form data
      this.getView().getModel("view").setProperty("/formData", {
        first_name: "",
        middle_name: "",
        last_name: "",
        email: "",
        phone: "",
        mobile: "",
        role: "",
        specialization: "",
        qualification: "",
        license_number: "",
        is_available: false,
        hire_date: "",
        is_active: false,
      });
    },

    onSavePress: function() {
      var oView = this.getView();
      var oViewModel = oView.getModel("view");
      var oFormData = oViewModel.getProperty("/formData");
      var sEntitySet = oViewModel.getProperty("/entitySetName");

      // Basic validation
      if (!oFormData.first_name && oFormData.first_name !== 0 && oFormData.first_name !== false) {
        MessageBox.error("First Name is required");
        return;
      }
      if (!oFormData.middle_name && oFormData.middle_name !== 0 && oFormData.middle_name !== false) {
        MessageBox.error("Middle Name is required");
        return;
      }
      if (!oFormData.last_name && oFormData.last_name !== 0 && oFormData.last_name !== false) {
        MessageBox.error("Last Name is required");
        return;
      }
      if (!oFormData.email && oFormData.email !== 0 && oFormData.email !== false) {
        MessageBox.error("Email is required");
        return;
      }
      if (!oFormData.phone && oFormData.phone !== 0 && oFormData.phone !== false) {
        MessageBox.error("Phone is required");
        return;
      }
      if (!oFormData.mobile && oFormData.mobile !== 0 && oFormData.mobile !== false) {
        MessageBox.error("Mobile is required");
        return;
      }
      if (!oFormData.role && oFormData.role !== 0 && oFormData.role !== false) {
        MessageBox.error("Role is required");
        return;
      }
      if (!oFormData.specialization && oFormData.specialization !== 0 && oFormData.specialization !== false) {
        MessageBox.error("Specialization is required");
        return;
      }
      if (!oFormData.qualification && oFormData.qualification !== 0 && oFormData.qualification !== false) {
        MessageBox.error("Qualification is required");
        return;
      }
      if (!oFormData.license_number && oFormData.license_number !== 0 && oFormData.license_number !== false) {
        MessageBox.error("License Number is required");
        return;
      }
      if (!oFormData.is_available && oFormData.is_available !== 0 && oFormData.is_available !== false) {
        MessageBox.error("Is Available is required");
        return;
      }
      if (!oFormData.hire_date && oFormData.hire_date !== 0 && oFormData.hire_date !== false) {
        MessageBox.error("Hire Date is required");
        return;
      }
      if (!oFormData.is_active && oFormData.is_active !== 0 && oFormData.is_active !== false) {
        MessageBox.error("Is Active is required");
        return;
      }

      oViewModel.setProperty("/busy", true);

      var oModel = this.getOwnerComponent().getModel();
      var oListBinding = oModel.bindList("/" + sEntitySet);
      var oContext = oListBinding.create(oFormData);

      oContext.created().then(function() {
        oViewModel.setProperty("/busy", false);
        MessageToast.show("Bus Staff created successfully");
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
      var oRouter = this._getRouter(); if (oRouter) { oRouter.navTo("busStaffListRoute"); };
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
