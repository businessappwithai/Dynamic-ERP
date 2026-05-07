/**
 * BusDepartment Create Controller
 *
 * Handles creation of new Bus Department records.
 * Form fields generated from sys_field metadata.
 *
 * Generated: 2026-03-09T11:47:10.454Z
 */
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(Controller, JSONModel, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("hospital-management-system.controller.entity.BusDepartmentCreate", {

    onInit: function() {
      var oViewModel = new JSONModel({
        busy: false,
        entityName: "bus_department",
        entityDisplayName: "Bus Department",
        entitySetName: "DepartmentSet",
        formData: {}
      });
      this.getView().setModel(oViewModel, "view");

      this._getRouter()
        .getRoute("busDepartmentCreateRoute")
        .attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function() {
      // Reset form data
      this.getView().getModel("view").setProperty("/formData", {
        name: "",
        description: "",
        department_type: "",
        is_active: false,
      });
    },

    onSavePress: function() {
      var oView = this.getView();
      var oViewModel = oView.getModel("view");
      var oFormData = oViewModel.getProperty("/formData");
      var sEntitySet = oViewModel.getProperty("/entitySetName");

      // Basic validation
      if (!oFormData.name && oFormData.name !== 0 && oFormData.name !== false) {
        MessageBox.error("Name is required");
        return;
      }
      if (!oFormData.description && oFormData.description !== 0 && oFormData.description !== false) {
        MessageBox.error("Description is required");
        return;
      }
      if (!oFormData.department_type && oFormData.department_type !== 0 && oFormData.department_type !== false) {
        MessageBox.error("Department Type is required");
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
        MessageToast.show("Bus Department created successfully");
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
      var oRouter = this._getRouter(); if (oRouter) { oRouter.navTo("busDepartmentListRoute"); };
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
