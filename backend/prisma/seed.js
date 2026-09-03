const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log(' Memulai proses seeding database Subur.in...');

  console.log(' Membersihkan data tanaman lama (jika ada)...');
  await prisma.device.deleteMany({});
  await prisma.plant.deleteMany({});

  console.log(' Memasukkan data tanaman default...');
  const plants = [
    {
      name: 'Bayam',
      scientificName: 'Spinacia oleracea',
      description: 'Sayuran hijau kaya zat besi dan vitamin. Memiliki sensitivitas tinggi terhadap genangan air serta tanah masam.',
      minPh: 6.0,
      maxPh: 7.0,
      phTarget: 6.5,
    },
    {
      name: 'Pakcoy',
      scientificName: 'Brassica rapa subsp. chinensis',
      description: 'Sayuran daun populer dengan sistem perakaran dangkal yang menyukai media lembab tapi berdrainase baik.',
      minPh: 6.0,
      maxPh: 7.5,
      phTarget: 6.8,
    },
    {
      name: 'Selada',
      scientificName: 'Lactuca sativa',
      description: 'Sayuran daun yang sangat sensitif terhadap cekaman kekeringan. Memerlukan kelembaban konstan di atas ambang MAD.',
      minPh: 6.0,
      maxPh: 6.7,
      phTarget: 6.5,
    }
  ];

  for (const plant of plants) {
    const createdPlant = await prisma.plant.create({
      data: plant
    });
    console.log(` Berhasil membuat tanaman: ${createdPlant.name}`);
  }

  console.log(' Membersihkan data polybag lama (jika ada)...');
  await prisma.polybag.deleteMany({});
  await prisma.polybagType.deleteMany({});

  console.log(' Memasukkan tipe polybag default...');
  const polybagTypes = [
    {
      name: 'Kecil',
      diameter: 20.0,
      height: 25.0,
    },
    {
      name: 'Standar',
      diameter: 25.0,
      height: 25.0,
    }
  ];

  const createdTypes = {};
  for (const type of polybagTypes) {
    const createdType = await prisma.polybagType.create({
      data: type
    });
    createdTypes[createdType.name.toLowerCase()] = createdType;
    console.log(` Berhasil membuat tipe polybag: ${createdType.name} (Dia: ${createdType.diameter}cm, T: ${createdType.height}cm)`);
  }

  console.log(' Memasukkan data polybag (penggunaan) default...');
  const polybags = [
    {
      polybagTypeId: createdTypes['kecil'].id,
      soilVolumeLiter: 7.07,
    },
    {
      polybagTypeId: createdTypes['standar'].id,
      soilVolumeLiter: 11.04,
    }
  ];

  for (const polybag of polybags) {
    const createdPolybag = await prisma.polybag.create({
      data: polybag,
      include: { polybagType: true }
    });
    console.log(` Berhasil membuat polybag: ${createdPolybag.polybagType.name} dengan Volume Tanah ${createdPolybag.soilVolumeLiter}L`);
  }

  console.log(' Proses seeding database selesai dengan sukses!');
}

main()
  .catch((e) => {
    console.error(' Terjadi error saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
