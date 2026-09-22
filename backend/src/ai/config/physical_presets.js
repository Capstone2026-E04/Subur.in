const prisma = require('../../database/connections/prisma_client');
const { AppError } = require('../../errors/AppError');

async function getPhysicalPreset(presetNameOrId) {
  if (!presetNameOrId) {
    throw new AppError('Identifikasi preset polybag (ID atau Nama) wajib diisi.', 400);
  }

  let polybag = null;

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(presetNameOrId);

    if (isUuid) {
      polybag = await prisma.polybag.findUnique({
        where: { id: presetNameOrId },
        include: { polybagType: true }
      });
    } else {
      polybag = await prisma.polybag.findFirst({
        where: {
          polybagType: {
            name: {
              equals: presetNameOrId,
              mode: 'insensitive'
            }
          }
        },
        include: { polybagType: true }
      });
    }
  } catch (dbError) {
    console.error('[PhysicalPresets] Gagal query data polybag:', {
      message: dbError.message,
      stack: dbError.stack,
      presetNameOrId,
    });
    throw dbError;
  }

  if (!polybag || !polybag.polybagType) {
    throw new AppError(`Data polybag dengan identitas "${presetNameOrId}" tidak ditemukan di database.`, 404);
  }

  const diameterCm = polybag.polybagType.diameter;
  const heightCm = polybag.polybagType.height;
  const hFillCm = heightCm - 2.5;
  const areaM2 = Math.PI * Math.pow((diameterCm / 2) / 100, 2);
  const volumeLiter = parseFloat((areaM2 * (hFillCm / 100) * 1000).toFixed(2));

  return {
    id: polybag.id,
    name: polybag.polybagType.name.toUpperCase(),
    diameterCm,
    heightCm,
    hFillCm,
    areaM2,
    volumeLiter,
  };
}

module.exports = { getPhysicalPreset };
