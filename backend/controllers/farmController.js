import Farm from '../models/Farm.js';

/**
 * @desc    Get all farms for logged-in user
 * @route   GET /api/farms
 * @access  Private
 */
export const getFarms = async (req, res) => {
  try {
    const farms = await Farm.find({ ownerId: req.user._id });
    res.status(200).json({
      success: true,
      count: farms.length,
      farms,
    });
  } catch (error) {
    console.error('Get farms error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Server error retrieving farms',
    });
  }
};

/**
 * @desc    Create a new farm
 * @route   POST /api/farms
 * @access  Private
 */
export const createFarm = async (req, res) => {
  const { farmName, location, soilType, crop, cropStage, area, areaUnit, waterSource, plantingDate, expectedHarvestDate } = req.body;

  try {
    if (!farmName) {
      return res.status(400).json({
        success: false,
        error: 'Farm name is required',
      });
    }

    const farm = await Farm.create({
      farmName,
      ownerId: req.user._id,
      location,
      soilType,
      crop,
      cropStage: cropStage || 'None',
      area,
      areaUnit: areaUnit || 'Acres',
      waterSource,
      plantingDate,
      expectedHarvestDate,
      lastUpdated: new Date()
    });

    res.status(201).json({
      success: true,
      farm,
    });
  } catch (error) {
    console.error('Create farm error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Server error creating farm',
    });
  }
};

/**
 * @desc    Update a farm
 * @route   PUT /api/farms/:id
 * @access  Private
 */
export const updateFarm = async (req, res) => {
  const { farmName, location, soilType, crop, cropStage, area, areaUnit, waterSource, plantingDate, expectedHarvestDate } = req.body;

  try {
    let farm = await Farm.findById(req.params.id);

    if (!farm) {
      return res.status(404).json({
        success: false,
        error: 'Farm not found',
      });
    }

    // Check ownership
    if (farm.ownerId.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to modify this farm',
      });
    }

    const updateData = {
      farmName: farmName !== undefined ? farmName : farm.farmName,
      location: location !== undefined ? location : farm.location,
      soilType: soilType !== undefined ? soilType : farm.soilType,
      crop: crop !== undefined ? crop : farm.crop,
      cropStage: cropStage !== undefined ? cropStage : farm.cropStage,
      area: area !== undefined ? area : farm.area,
      areaUnit: areaUnit !== undefined ? areaUnit : farm.areaUnit,
      waterSource: waterSource !== undefined ? waterSource : farm.waterSource,
      plantingDate: plantingDate !== undefined ? plantingDate : farm.plantingDate,
      expectedHarvestDate: expectedHarvestDate !== undefined ? expectedHarvestDate : farm.expectedHarvestDate,
      lastUpdated: new Date()
    };

    farm = await Farm.findByIdAndUpdate(req.params.id, updateData, { new: true });

    res.status(200).json({
      success: true,
      farm,
    });
  } catch (error) {
    console.error('Update farm error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Server error updating farm',
    });
  }
};

/**
 * @desc    Delete a farm
 * @route   DELETE /api/farms/:id
 * @access  Private
 */
export const deleteFarm = async (req, res) => {
  try {
    const farm = await Farm.findById(req.params.id);

    if (!farm) {
      return res.status(404).json({
        success: false,
        error: 'Farm not found',
      });
    }

    // Check ownership
    if (farm.ownerId.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to delete this farm',
      });
    }

    await Farm.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Farm deleted successfully',
    });
  } catch (error) {
    console.error('Delete farm error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Server error deleting farm',
    });
  }
};
