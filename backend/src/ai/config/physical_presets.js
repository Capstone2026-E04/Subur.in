const prisma = require('../../database/connections/prisma_client');

async function getPhysicalPreset(presetNameOrId) {
  if (!presetNameOrId) {
    throw new Error('Identifikasi preset polybag (ID atau Nama) wajib diisi.');
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
    throw new Error(`Database error saat memuat data polybag: "${dbError.message}".`);
  }

  if (!polybag || !polybag.polybagType) {
    throw new Error(`Data polybag dengan identitas "${presetNameOrId}" tidak ditemukan di database.`);
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
