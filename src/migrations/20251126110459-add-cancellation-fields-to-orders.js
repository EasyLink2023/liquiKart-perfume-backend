export async function up(queryInterface, Sequelize) {

  await queryInterface.sequelize.transaction(async (transaction) => {

    await queryInterface.addColumn('orders', 'cancellation_reason', {
      type: Sequelize.STRING,
      allowNull: true
    }, { transaction });

    await queryInterface.addColumn('orders', 'cancellation_notes', {
      type: Sequelize.TEXT,
      allowNull: true
    }, { transaction });

    await queryInterface.addColumn('orders', 'cancelled_by', {
      type: Sequelize.ENUM('customer', 'admin', 'system'),
      allowNull: true
    }, { transaction });

    await queryInterface.addColumn('orders', 'cancelled_at', {
      type: Sequelize.DATE,
      allowNull: true
    }, { transaction });

  });

  await queryInterface.addIndex('orders', ['cancelled_at']);
  await queryInterface.addIndex('orders', ['cancelled_by']);
  await queryInterface.addIndex('orders', ['status', 'cancelled_at']);
}

export async function down(queryInterface, Sequelize) {

  await queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.removeIndex('orders', ['cancelled_at']);
    await queryInterface.removeIndex('orders', ['cancelled_by']);
    await queryInterface.removeIndex('orders', ['status', 'cancelled_at']);

    await queryInterface.removeColumn('orders', 'cancellation_reason', { transaction });
    await queryInterface.removeColumn('orders', 'cancellation_notes', { transaction });
    await queryInterface.removeColumn('orders', 'cancelled_by', { transaction });
    await queryInterface.removeColumn('orders', 'cancelled_at', { transaction });
  });

}