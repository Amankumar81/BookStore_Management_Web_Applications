class ApiFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
    this.filters = {};
  }

  // Search
search() {
  if (this.queryString.search) {
    this.filters.$or = [
      {
        title: {
          $regex: this.queryString.search,
          $options: "i",
        },
      },
      {
        author: {
          $regex: this.queryString.search,
          $options: "i",
        },
      },
      {
        category: {
          $regex: this.queryString.search,
          $options: "i",
        },
      },
    ];

    this.query = this.query.find(this.filters);
  }

  return this;
}

  // Filter
  filter() {
    const filter = this.filters;

    if (this.queryString.category) {
      filter.category = this.queryString.category;
    }

    if (this.queryString.author) {
      filter.author = this.queryString.author;
    }

    if (this.queryString.featured) {
      filter.featured = this.queryString.featured === "true";
    }

    if (this.queryString.bestSeller) {
      filter.bestSeller = this.queryString.bestSeller === "true";
    }

    if (this.queryString.minPrice || this.queryString.maxPrice) {
      filter.price = {};

      if (this.queryString.minPrice) {
        filter.price.$gte = Number(this.queryString.minPrice);
      }

      if (this.queryString.maxPrice) {
        filter.price.$lte = Number(this.queryString.maxPrice);
      }
    }

    this.query = this.query.find(filter);

    return this;
  }

  // Sort
  sort() {
    if (this.queryString.sort) {
      this.query = this.query.sort(this.queryString.sort);
    } else {
      this.query = this.query.sort("-createdAt");
    }

    return this;
  }

  // Field Selection
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(",").join(" ");
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select("-__v");
    }

    return this;
  }

  // Pagination
  paginate() {
    const page = Number(this.queryString.page) || 1;
    const limit = Number(this.queryString.limit) || 10;

    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = ApiFeatures;