const ms = require('ms');

const buildFill = require('./build-fill');
const convertProtocolFee = require('../../fills/convert-protocol-fee');
const convertRelayerFees = require('../../fills/convert-relayer-fees');
const createNewTokens = require('../../tokens/create-new-tokens');
const getEventData = require('../../events/get-event-data');
const getUniqTokens = require('./get-uniq-tokens');
const hasProtocolFee = require('../../fills/has-protocol-fee');
const hasRelayerFees = require('../../fills/has-relayer-fees');
const indexFill = require('../../index/index-fill');
const indexTradedTokens = require('../../index/index-traded-tokens');
const persistFill = require('./persist-fill');
const withTransaction = require('../../util/with-transaction');

const createFill = async (event, transaction) => {
  const data = getEventData(event);
  const fill = buildFill({
    eventData: data,
    eventId: event._id,
    protocolVersion: event.protocolVersion,
    transaction,
  });

  const tokens = getUniqTokens(data.assets, data.fees);
  await createNewTokens(tokens);

  await withTransaction(async session => {
    const newFill = await persistFill(session, fill);

    await indexFill(newFill._id, ms('30 seconds'));
    await indexTradedTokens(newFill);

    if (hasProtocolFee(newFill)) {
      await convertProtocolFee(newFill, ms('30 seconds'));
    }

    if (hasRelayerFees(newFill)) {
      await convertRelayerFees(newFill._id, ms('30 seconds'));
    }
  });
};

module.exports = createFill;
