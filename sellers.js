async function showallsellers(res) {
    try {
        const sellersActivos = await client.sMembers('sellersactivos');
        res.json(sellersActivos);
    } catch (error) {
        console.error("Could not connect to Redis:", error.message);
        res.status(500).send("Error en la conexión con Redis");
    }
}

// Función para agregar un seller activo
async function agregarSellerActivo(sellerId) {
    try {
        await client.sAdd('sellersactivos', sellerId);
    } catch (error) {
        console.error(`Error al agregar el Seller ID '${sellerId}':`, error.message);
    }
}

// Función para quitar un seller activo
async function quitarSellerActivo(sellerId) {
    try {
        const result = await client.sRem('sellersactivos', sellerId);
        if (result === 0) {
            console.log(`Seller ID '${sellerId}' no se encontró en 'sellersactivos'.`);
        } else {
            eliminarSellerV2(sellerId);
            console.log(`Seller ID '${sellerId}' quitado de 'sellersactivos'.`);
        }
    } catch (error) {
        console.error(`Error al quitar el Seller ID '${sellerId}':`, error.message);
    }
}

// Función para agregar un seller activo V2
async function agregarSellerActivoV2(sellerId, row) {
    try {
        const key = 'sellersactivosV2';
        const clavenueva = `${row.didEmpresa}-${row.didCliente}-${row.didCuenta}`;

        // Verificar si el hash existe
        const exists = await client.exists(key);
        if (!exists) {
            // Crear el hash si no existe
            const datos = [{
                didEmpresa: row.didEmpresa,
                didCliente: row.didCliente,
                didCuenta: row.didCuenta,
                me1: row.me1,
                ff: row.ff,
                ia: row.ia,
                clave: clavenueva
            }];
            await client.hSet(key, sellerId, JSON.stringify(datos));
            console.log(`Clave '${key}' creada y datos agregados para seller_id: ${sellerId}`);
        } else {
            // Si ya existe, agregar o actualizar el array de datos
            const currentData = await client.hGet(key, sellerId);
            const currentDataArray = currentData ? JSON.parse(currentData) : [];
            const existe = currentDataArray.some(data => data.clave === clavenueva);

            if (!existe) {
                currentDataArray.push({
                    didEmpresa: row.didEmpresa,
                    didCliente: row.didCliente,
                    didCuenta: row.didCuenta,
                    me1: row.me1,
                    ff: row.ff,
                    ia: row.ia,
                    clave: clavenueva
                });
                await client.hSet(key, sellerId, JSON.stringify(currentDataArray));
                console.log(`Datos agregados a seller_id: ${sellerId}`);
            }
        }
    } catch (error) {
        console.error(`Error al agregar datos a seller_id '${sellerId}':`, error.message);
    }
}

// Función para mostrar todos los sellers activos V2
async function showallsellersV2(res) {
    try {
        const sellerIds = await client.hKeys('sellersactivosV2');
        if (sellerIds.length === 0) {
            res.send("No hay sellers activos.");
            return;
        }

        const Adata = {};
        for (const sellerId of sellerIds) {
            const currentToken = await client.hGet('sellersactivosV2', sellerId);
            Adata[sellerId] = JSON.parse(currentToken);
        }

        res.json(Adata);
    } catch (error) {
        console.error("Could not connect to Redis:", error.message);
        res.status(500).send("Error en la conexión con Redis");
    }
}

// Función para eliminar un seller activo V2
async function eliminarSellerV2(sellerId) {
    try {
        const exists = await client.hExists('sellersactivosV2', sellerId);
        if (exists) {
            await client.hDel('sellersactivosV2', sellerId);
            console.log(`Seller ID ${sellerId} eliminado correctamente.`);
        } else {
            console.log(`El seller_id ${sellerId} no existe en 'sellersactivosV2'.`);
        }
    } catch (error) {
        console.error(`Error al eliminar seller_id ${sellerId}:`, error.message);
    }
}

// Función para eliminar todos los sellers V2
async function deleteAllv2() {
    await client.del('sellersactivos');
    await client.del('sellersactivosV2');
}


module.exports = {
    showallsellers,
    agregarSellerActivo,
    quitarSellerActivo,
    agregarSellerActivoV2,
    showallsellersV2,
    eliminarSellerV2,
    deleteAllv2
};