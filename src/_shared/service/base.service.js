const mongoose = require("mongoose");

class BaseService {
  constructor(model) {
    this.model = model;
  }

  handleError(error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return { status: 400, error: `Validation Error: ${error.message}` };
    } else if (error instanceof mongoose.Error.CastError) {
      return { status: 400, error: `Cast Error: ${error.message}` };
    } else if (error instanceof mongoose.Error.DocumentNotFoundError) {
      return { status: 404, error: `Document Not Found: ${error.message}` };
    } else if (error instanceof mongoose.Error.OverwriteModelError) {
      return { status: 500, error: `Overwrite Model Error: ${error.message}` };
    } else if (error.code && error.code === 11000) {
      return { status: 400, error: `Duplicate Key Error: ${error.message}` };
    } else if (error.code && error.code === 121) {
      return {
        status: 400,
        error: `Document Validation Error: ${error.message}`,
      };
    } else if (error.code && error.code === 13435) {
      return { status: 500, error: `Index Build Failure: ${error.message}` };
    } else if (error.code && error.code === 50) {
      return { status: 500, error: `Database Exception: ${error.message}` };
    } else if (error.code && error.code === 55) {
      return { status: 400, error: `Namespace Exists: ${error.message}` };
    } else if (error.code && error.code === 100) {
      return { status: 500, error: `Host Unreachable: ${error.message}` };
    } else if (error.code && error.code === 91) {
      return { status: 500, error: `No Primary Replica Set: ${error.message}` };
    } else if (error.code && error.code === "ECONNREFUSED") {
      return { status: 500, error: `Connection Refused: ${error.message}` };
    } else if (error.code && error.code === "ENOTFOUND") {
      return {
        status: 500,
        error: `Database Host Not Found: ${error.message}`,
      };
    } else if (error.code && error.code === "ETIMEDOUT") {
      return { status: 500, error: `Connection Timeout: ${error.message}` };
    } else if (error.code && error.code === "EAI_AGAIN") {
      return { status: 500, error: `DNS Lookup Failed: ${error.message}` };
    } else if (error.code && error.code === "EADDRINUSE") {
      return { status: 500, error: `Address in Use: ${error.message}` };
    } else {
      console.log(error)
      return { status: 500, error: `Database Error: ${error.message}` };
    }
  }

  // Corrección: Implementar el método handleDocumentNotFound que faltaba
  handleDocumentNotFound() {
    return { status: 404, error: "Document not found" };
  }

  queryPopulate(populates, selectOptions, query) {
    populates.forEach((populateOptions) => {
      query.populate(populateOptions);
    });

    if (selectOptions) {
      query.select(selectOptions);
    }

    return query;
  }

  async create(data, populateOptions = [], selectOptions = null) {
    try {
      const doc = new this.model(data);
      const savedDoc = await doc.save();

      if (populateOptions.length || selectOptions) {
        const populatedDoc = await this.findById(
          savedDoc._id,
          populateOptions,
          selectOptions
        );
        return { status: 201, data: populatedDoc.data };
      }
      return { status: 201, data: savedDoc };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Mejora: Añadir opción de ordenación
  async findAll(page = 0, limit = 250, filters = {}, populateOptions = [], selectOptions = null, sort = { createdAt: -1 }) {
    const pageNum = Math.max(0, parseInt(page, 10) || 0); // 0-based
    const pageSize = Math.min(250, parseInt(limit, 10) || 250);

    try {
      let query = this.model.find({ ...filters, deletedAt: null });

      if ((populateOptions && populateOptions.length) || selectOptions) {
        query = this.queryPopulate(populateOptions || [], selectOptions || null, query);
      }

      // Aplicar ordenación
      if (sort) {
        query = query.sort(sort);
      }

      const totalDocs = await this.model.countDocuments({ ...filters, deletedAt: null });
      const docs = await query.skip(pageNum * pageSize).limit(pageSize).exec();

      return {
        status: 200,
        data: docs,
        pagination: {
          totalDocs,
          totalPages: Math.ceil(totalDocs / pageSize),
          currentPage: pageNum,
          pageSize,
        },
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async findById(id, populateOptions = [], selectOptions = null) {
    try {
      let query = this.model.findOne({ _id: id, deletedAt: null });

      if (populateOptions.length || selectOptions) {
        query = this.queryPopulate(populateOptions, selectOptions, query);
      }

      const doc = await query.exec();
      if (!doc) return { status: 404, error: "Document not found" };
      return { status: 200, data: doc };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async findOneByCriteria(filters, populateOptions = [], selectOptions = null) {
    try {
      let query = this.model.findOne({ ...filters, deletedAt: null });

      if (populateOptions.length || selectOptions) {
        query = this.queryPopulate(populateOptions, selectOptions, query);
      }

      const doc = await query.exec();
      if (!doc) return { status: 404, error: "Document not found" };
      return { status: 200, data: doc };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updateById(id, updateData, populateOptions = [], selectOptions = null) {
    try {
      let query = this.model.findOneAndUpdate(
        { _id: id, deletedAt: null },
        { ...updateData, updatedAt: new Date() },
        { new: true }
      );

      if (populateOptions.length || selectOptions) {
        query = this.queryPopulate(populateOptions, selectOptions, query);
      }

      const updatedDoc = await query.exec();
      if (!updatedDoc) return { status: 404, error: "Document not found" };
      return { status: 200, data: updatedDoc };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async softDeleteById(id, populateOptions = [], selectOptions = null) {
    try {
      let query = this.model.findById(id);

      if (populateOptions.length || selectOptions) {
        query = this.queryPopulate(populateOptions, selectOptions, query);
      }

      const doc = await query.exec();
      if (!doc) return this.handleDocumentNotFound();

      doc.deletedAt = new Date();
      await doc.save();

      return { status: 200, message: "Document soft deleted", data: doc };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async deleteById(id, populateOptions = [], selectOptions = null) {
    try {
      let query = this.model.findByIdAndDelete(id);

      if (populateOptions.length || selectOptions) {
        query = this.queryPopulate(populateOptions, selectOptions, query);
      }

      const deletedDoc = await query.exec();
      if (!deletedDoc) return { status: 404, error: "Document not found" };
      return { status: 200, message: "Document deleted" };
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  // Nueva funcionalidad: operaciones en lote
  async createMany(dataArray) {
    try {
      const result = await this.model.insertMany(dataArray);
      return { status: 201, data: result, count: result.length };
    } catch (error) {
      return this.handleError(error);
    }
  }
  
  // Nueva funcionalidad: actualización condicional
  async findOneAndUpdate(filter, updateData, options = { new: true }) {
    try {
      const updatedDoc = await this.model.findOneAndUpdate(
        { ...filter, deletedAt: null },
        { ...updateData, updatedAt: new Date() },
        options
      );
      
      if (!updatedDoc && options.new) return { status: 404, error: "Document not found" };
      return { status: 200, data: updatedDoc };
    } catch (error) {
      return this.handleError(error);
    }
  }
}

module.exports = BaseService;