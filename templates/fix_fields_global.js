// FIX Protocol Fields - Generated from https://fiximate.fixtrading.org/en/FIX.Latest/fields_sorted_by_tagnum.html
// Format: 'Tag': 'Field Name'

const fixFieldMap = {
  '1': 'Account',
  '2': 'AdvId',
  '3': 'AdvRefID',
  '4': 'AdvSide',
  '5': 'AdvTransType',
  '6': 'AvgPx',
  '7': 'BeginSeqNo',
  '8': 'BeginString',
  '9': 'BodyLength',
  '10': 'CheckSum',
  '11': 'ClOrdID',
  '12': 'Commission',
  '13': 'CommType',
  '14': 'CumQty',
  '15': 'Currency',
  '16': 'EndSeqNo',
  '17': 'ExecID',
  '18': 'ExecInst',
  '19': 'ExecRefID',
  '20': 'HandlInst',
  '21': 'SecurityIDSource',
  '22': 'SecurityIDSource',
  '23': 'IOIid',
  '24': 'IOIOthSvc',
  '25': 'IOIQltyInd',
  '26': 'IOIRefID',
  '27': 'IOIQty',
  '28': 'IOITransType',
  '29': 'LastCapacity',
  '30': 'LastMkt',
  '31': 'LastPx',
  '32': 'LastQty',
  '33': 'LinesOfText',
  '34': 'MsgSeqNum',
  '35': 'MsgType',
  '36': 'NewSeqNo',
  '37': 'OrderID',
  '38': 'OrderQty',
  '39': 'OrdStatus',
  '40': 'OrdType',
  '41': 'OrigClOrdID',
  '42': 'OrigTime',
  '43': 'PossDupFlag',
  '44': 'Price',
  '45': 'RefSeqNum',
  '46': 'RelatdSym',
  '47': 'Rule80A',
  '48': 'SecurityID',
  '49': 'SenderCompID',
  '50': 'SenderSubID',
  '51': 'SendingTime',
  '52': 'SendingTime',
  '53': 'Quantity',
  '54': 'Side',
  '55': 'Symbol',
  '56': 'TargetCompID',
  '57': 'TargetSubID',
  '58': 'Text',
  '59': 'TimeInForce',
  '60': 'TransactTime',
  '61': 'Urgency',
  '62': 'ValidUntilTime',
  '63': 'SettlType',
  '64': 'SettlDate',
  '65': 'SymbolSfx',
  '66': 'ListID',
  '67': 'ListSeqNo',
  '68': 'TotNoOrders',
  '69': 'ListExecInst',
  '70': 'AllocID',
  '71': 'AllocTransType',
  '72': 'RefAllocID',
  '73': 'NoOrders',
  '74': 'AvgPxPrecision',
  '75': 'TradeDate',
  '76': 'PositionEffect',
  '77': 'NoAllocs',
  '78': 'AllocAccount',
  '79': 'AllocQty',
  '80': 'ProcessCode',
  '81': 'NoRpts',
  '82': 'RptSeq',
  '83': 'CxlQty',
  '84': 'NoDlvyInst',
  '85': 'DlvyInst',
  '86': 'AllocStatus',
  '87': 'AllocRejCode',
  '88': 'Signature',
  '89': 'SecureDataLen',
  '90': 'SecureData',
  '91': 'SignatureLength',
  '92': 'EmailType',
  '93': 'RawDataLength',
  '94': 'RawData',
  '95': 'PossResend',
  '96': 'EncryptMethod',
  '97': 'StopPx',
  '98': 'ExDestination',
  '99': 'CxlRejReason',
  '100': 'OrdRejReason',
  '102': 'CxlRejResponseTo',
  '103': 'OrdRejReason',
  '104': 'IOIQualifier',
  '105': 'WaveNo',
  '106': 'Issuer',
  '107': 'SecurityDesc',
  '108': 'HeartBtInt',
  '109': 'ClientID',
  '110': 'MinQty',
  '111': 'MaxFloor',
  '112': 'TestReqID',
  '113': 'ReportToExch',
  '114': 'LocateReqd',
  '115': 'OnBehalfOfCompID',
  '116': 'OnBehalfOfSubID',
  '117': 'QuoteID',
  '118': 'NetMoney',
  '119': 'SettlCurrAmt',
  '120': 'SettlCurrency',
  '121': 'ForexReq',
  '122': 'OrigSendingTime',
  '123': 'GapFillFlag',
  '124': 'NoExecs',
  '125': 'ExpireTime',
  '126': 'DKReason',
  '127': 'DeliverToCompID',
  '128': 'DeliverToSubID',
  '129': 'IOINaturalFlag',
  '130': 'QuoteReqID',
  '131': 'QuoteAckStatus',
  '132': 'DKReason',
  '133': 'ReportToExch',
  '134': 'CxlRejResponseTo',
  '135': 'DisplayQty',
  '136': 'NoMiscFees',
  '137': 'MiscFeeAmt',
  '138': 'MiscFeeCurr',
  '139': 'MiscFeeType',
  '140': 'PrevClosePx',
  '141': 'ResetSeqNumFlag',
  '142': 'SenderLocationID',
  '143': 'TargetLocationID',
  '144': 'OnBehalfOfLocationID',
  '145': 'DeliverToLocationID',
  '146': 'NoRelatedSym',
  '147': 'Subject',
  '148': 'Headline',
  '149': 'URLLink',
  '150': 'ExecType',
  '151': 'LeavesQty',
  '152': 'CashOrderQty',
  '153': 'AllocAvgPx',
  '154': 'AllocNetMoney',
  '155': 'SettlCurrFxRate',
  '156': 'SettlCurrFxRateCalc',
  '157': 'NumDaysInterest',
  '158': 'AccruedInterestRate',
  '159': 'AccruedInterestAmt',
  '160': 'SettlInstMode',
  '161': 'AllocText',
  '162': 'SettlInstID',
  '163': 'SettlInstTransType',
  '164': 'EmailThreadID',
  '165': 'SettlInstSource',
  '166': 'SettlLocation',
  '167': 'SecurityType',
  '168': 'EffectiveTime',
  '169': 'StandInstDbType',
  '170': 'StandInstDbName',
  '171': 'StandInstDbID',
  '172': 'SettlDeliveryType',
  '173': 'SettlDepositoryCode',
  '174': 'SettlBrkrCode',
  '175': 'SettlInstCode',
  '176': 'SecuritySettlAgentName',
  '177': 'SecuritySettlAgentCode',
  '178': 'SecuritySettlAgentAcctNum',
  '179': 'SecuritySettlAgentAcctName',
  '180': 'SecuritySettlAgentContactName',
  '181': 'SecuritySettlAgentContactPhone',
  '182': 'CashSettlAgentName',
  '183': 'CashSettlAgentCode',
  '184': 'CashSettlAgentAcctNum',
  '185': 'CashSettlAgentAcctName',
  '186': 'CashSettlAgentContactName',
  '187': 'CashSettlAgentContactPhone',
  '188': 'BidSpotRate',
  '189': 'BidForwardPoints',
  '190': 'OfferSpotRate',
  '191': 'OfferForwardPoints',
  '192': 'OrderQty2',
  '193': 'SettlDate2',
  '194': 'LastSpotRate',
  '195': 'LastForwardPoints',
  '196': 'AllocLinkID',
  '197': 'AllocLinkType',
  '198': 'SecondaryOrderID',
  '199': 'NoIOIQualifiers',
  '200': 'MaturityMonthYear',
  '201': 'PutOrCall',
  '202': 'StrikePrice',
  '203': 'CoveredOrUncovered',
  '204': 'OptAttribute',
  '205': 'SecurityExchange',
  '206': 'NotifyBrokerOfCredit',
  '207': 'AllocHandlInst',
  '208': 'MaxShow',
  '209': 'PegOffsetValue',
  '210': 'AllocTransType',
  '211': 'NoRoutingIDs',
  '212': 'RoutingType',
  '213': 'RoutingID',
  '214': 'SpreadToBenchmark',
  '215': 'Benchmark',
  '216': 'CouponRate',
  '217': 'CouponPaymentDate',
  '218': 'IssueDate',
  '219': 'RepurchaseTerm',
  '220': 'RepurchaseRate',
  '221': 'Factor',
  '222': 'TradeOriginationDate',
  '223': 'ExDate',
  '224': 'ContractMultiplier',
  '225': 'NoStipulations',
  '226': 'StipulationType',
  '227': 'StipulationValue',
  '228': 'YieldType',
  '229': 'Yield',
  '230': 'TotalTakedown',
  '231': 'Concession',
  '232': 'RepoCollateralSecurityType',
  '233': 'RepurchaseTerm',
  '234': 'RepurchaseRate',
  '235': 'Factor',
  '236': 'RepoCollateralSecurityType',
  '237': 'RepurchaseTerm',
  '238': 'RepurchaseRate',
  '239': 'Factor',
  '240': 'RedemptionDate',
  '241': 'CreditRating',
  '242': 'UnderlyingCouponPaymentDate',
  '243': 'UnderlyingIssueDate',
  '244': 'UnderlyingRepoCollateralSecurityType',
  '245': 'UnderlyingRepurchaseTerm',
  '246': 'UnderlyingRepurchaseRate',
  '247': 'UnderlyingFactor',
  '248': 'UnderlyingRedemptionDate',
  '249': 'LegCouponPaymentDate',
  '250': 'LegIssueDate',
  '251': 'LegRepoCollateralSecurityType',
  '252': 'LegRepurchaseTerm',
  '253': 'LegRepurchaseRate',
  '254': 'LegFactor',
  '255': 'LegRedemptionDate',
  '256': 'CreditRating',
  '257': 'UnderlyingCreditRating',
  '258': 'LegCreditRating',
  '259': 'TradedFlatSwitch',
  '260': 'BasisFeatureDate',
  '261': 'BasisFeaturePrice',
  '262': 'QuoteStatus',
  '263': 'LegQty',
  '264': 'LegSwapType',
  '265': 'LegSettlType',
  '266': 'LegSettlDate',
  '267': 'LegPriceType',
  '268': 'LegBidPx',
  '269': 'LegOfferPx',
  '270': 'TradingSessionID',
  '271': 'TradSesMethod',
  '272': 'TradSesMode',
  '273': 'TradSesStatus',
  '274': 'TradSesStartTime',
  '275': 'TradSesOpenTime',
  '276': 'TradSesPreCloseTime',
  '277': 'TradSesCloseTime',
  '278': 'TradSesEndTime',
  '279': 'FeeMultiplier',
  '280': 'AllocStatus',
  '281': 'AllocRejCode',
  '282': 'AllocLinkType',
  '283': 'AllocLinkID',
  '284': 'AllocAvgPx',
  '285': 'AllocNetMoney',
  '286': 'AllocSettlCurrAmt',
  '287': 'AllocSettlCurrency',
  '288': 'AllocSettlCurrFxRate',
  '289': 'AllocSettlCurrFxRateCalc',
  '290': 'AllocAccruedInterestAmt',
  '291': 'AllocInterestAtMaturity',
  '292': 'NoOrders',
  '293': 'AvgPrxPrecision',
  '294': 'TradeOriginationDate',
  '295': 'ExDate',
  '296': 'ContractMultiplier',
  '297': 'TradedFlatSwitch',
  '298': 'BasisFeatureDate',
  '299': 'BasisFeaturePrice',
  '300': 'ConcessionAmount',
  '301': 'TotalTakedownAmount',
  '302': 'NetMoney',
  '303': 'SettlCurrAmt',
  '304': 'SettlCurrency',
  '305': 'SettlCurrFxRate',
  '306': 'SettlCurrFxRateCalc',
  '307': 'AllocAvgPx',
  '308': 'AllocNetMoney',
  '309': 'AllocSettlCurrAmt',
  '310': 'AllocSettlCurrency',
  '311': 'AllocSettlCurrFxRate',
  '312': 'ProcessCode',
  '313': 'NoStipulations',
  '314': 'StipulationType',
  '315': 'StipulationValue',
  '316': 'YieldType',
  '317': 'Yield',
  '318': 'TotalTakedown',
  '319': 'Concession',
  '320': 'CreditRating',
  '321': 'UnderlyingCreditRating',
  '322': 'LegCreditRating',
  '323': 'QuoteRequestType',
  '324': 'QuoteType',
  '325': 'QuoteResponseLevel',
  '326': 'QuoteRequestRejectReason',
  '327': 'QuoteRejectReason',
  '328': 'QuoteCancelType',
  '329': 'QuoteStatus',
  '330': 'QuoteSizeType',
  '331': 'QuoteRespID',
  '332': 'QuoteRespType',
  '333': 'UnderlyingIDSource',
  '334': 'QuoteRequestRejectReason',
  '335': 'QuoteRejectReason',
  '336': 'QuoteCancelType',
  '337': 'QuoteStatus',
  '338': 'QuoteSizeType',
  '339': 'QuoteRespID',
  '340': 'QuoteRespType',
  '341': 'UnderlyingSymbol',
  '342': 'UnderlyingSymbolSfx',
  '343': 'UnderlyingSecurityID',
  '344': 'UnderlyingIDSource',
  '345': 'UnderlyingSecurityType',
  '346': 'UnderlyingMaturityMonthYear',
  '347': 'UnderlyingPutOrCall',
  '348': 'UnderlyingStrikePrice',
  '349': 'UnderlyingOptAttribute',
  '350': 'UnderlyingCurrency',
  '351': 'RatioQty',
  '352': 'SecurityExchange',
  '353': 'UnderlyingSecurityExchange',
  '354': 'CxlRejReason',
  '355': 'UnderlyingCouponRate',
  '356': 'UnderlyingContractMultiplier',
  '357': 'ContraTradeQty',
  '358': 'ContraTradeTime',
  '359': 'ClearingFirm',
  '360': 'ClearingAccount',
  '361': 'LiquidityNumSecurities',
  '362': 'MultiLegReportingType',
  '363': 'StrategyParameterName',
  '364': 'StrategyParameterType',
  '365': 'StrategyParameterValue',
  '366': 'Price2',
  '367': 'PriceType',
  '368': 'DayOrderQty',
  '369': 'DayCumQty',
  '370': 'DayAvgPx',
  '371': 'GTBookingInst',
  '372': 'TradeDate',
  '373': 'TransactTime',
  '374': 'ReportID',
  '375': 'RepurchaseTerm',
  '376': 'RepurchaseRate',
  '377': 'Factor',
  '378': 'TradeOriginationDate',
  '379': 'ExDate',
  '380': 'ContractMultiplier',
  '381': 'NoTradingSessions',
  '382': 'TradingSessionID',
  '383': 'ContraTrader',
  '384': 'TradingSessionSubID',
  '385': 'TotalVolumeTraded',
  '386': 'NoUnderlyings',
  '387': 'UnderlyingSymbol',
  '388': 'UnderlyingSymbolSfx',
  '389': 'UnderlyingSecurityID',
  '390': 'UnderlyingIDSource',
  '391': 'NoUnderlyingSecurityAltID',
  '392': 'UnderlyingSecurityAltID',
  '393': 'UnderlyingSecurityAltIDSource',
  '394': 'UnderlyingProduct',
  '395': 'UnderlyingCFICode',
  '396': 'UnderlyingSecurityType',
  '397': 'UnderlyingMaturityMonthYear',
  '398': 'UnderlyingPutOrCall',
  '399': 'UnderlyingStrikePrice',
  '400': 'UnderlyingOptAttribute',
  '401': 'UnderlyingSecurityExchange',
  '402': 'UnderlyingIssuer',
  '403': 'EncodedUnderlyingIssuerLen',
  '404': 'EncodedUnderlyingIssuer',
  '405': 'UnderlyingSecurityDesc',
  '406': 'EncodedUnderlyingSecurityDescLen',
  '407': 'EncodedUnderlyingSecurityDesc',
  '408': 'UnderlyingCPProgram',
  '409': 'UnderlyingCPRegType',
  '410': 'UnderlyingCurrency',
  '411': 'UnderlyingQty',
  '412': 'UnderlyingSettlementType',
  '413': 'UnderlyingCashAmount',
  '414': 'UnderlyingCashType',
  '415': 'UnderlyingPx',
  '416': 'UnderlyingDirtyPrice',
  '417': 'UnderlyingEndPrice',
  '418': 'UnderlyingStartValue',
  '419': 'UnderlyingCurrentValue',
  '420': 'UnderlyingEndValue',
  '421': 'UnderlyingAdjustedQuantity',
  '422': 'NoUnderlyingStips',
  '423': 'PriceType',
  '424': 'UnderlyingStipValue',
  '425': 'UnderlyingAllocationPercent',
  '426': 'UnderlyingSettlementType',
  '427': 'UnderlyingCashAmount',
  '428': 'UnderlyingCashType',
  '429': 'UnderlyingUnitOfMeasure',
  '430': 'UnderlyingTimeUnit',
  '431': 'UnderlyingCapValue',
  '432': 'UnderlyingSettlMethod',
  '433': 'UnderlyingPutOrCall',
  '434': 'UnderlyingContractMultiplier',
  '435': 'UnderlyingUnitOfMeasure',
  '436': 'UnderlyingTimeUnit',
  '437': 'UnderlyingExerciseStyle',
  '438': 'UnderlyingCouponRate',
  '439': 'UnderlyingSecurityExchange',
  '440': 'UnderlyingIssuer',
  '441': 'UnderlyingSecurityDesc',
  '442': 'MultiLegReportingType',
  '443': 'UnderlyingSecurityID',
  '444': 'UnderlyingSecurityType',
  '445': 'UnderlyingSymbol',
  '446': 'UnderlyingSymbolSfx',
  '447': 'PartyIDSource',
  '448': 'PartyID',
  '451': 'UnderlyingIDSource',
  '452': 'PartyRole',
  '453': 'NoPartyIDs',
  '455': 'SecurityAltID',
  '456': 'SecurityAltIDSource',
  '461': 'CFICode',
  '462': 'FillExecID',
  '463': 'FillPx',
  '464': 'FillQty',
  '487': 'TradeReportTransType',
  '523': 'PartySubID',
  '526': 'SideSecondaryClOrdID',
  '527': 'SecondaryExecID',
  '552': 'TrdCapRptSideGrp',
  '555': 'TrdInstrmtLegGrp',
  '556': 'DerivativeSecurityStatus',
  '557': 'DerivativeInstrRegistry',
  '558': 'DerivativeCountryOfIssue',
  '559': 'DerivativeStateOrProvinceOfIssue',
  '560': 'DerivativeLocaleOfIssue',
  '561': 'DerivativeStrikeMultiplier',
  '562': 'DerivativeStrikeCurrency',
  '563': 'DerivativeUnitOfMeasure',
  '564': 'DerivativeUnitOfMeasureQty',
  '565': 'DerivativeTimeUnit',
  '566': 'DerivativeSecurityExchange',
  '567': 'DerivativePositionLimit',
  '568': 'TradeRequestID',
  '569': 'DerivativeEncodedIssuerLen',
  '570': 'DerivativeEncodedIssuer',
  '571': 'TradeReportID',
  '578': 'TradeInputSource',
  '582': 'CustOrderCapacity',
  '600': 'LegSymbol',
  '602': 'LegSecurityID',
  '603': 'LegSecurityIDSource',
  '605': 'LegSecurityAltID',
  '606': 'LegSecurityAltIDSource',
  '608': 'LegCFICode',
  '609': 'LegSecurityType',
  '616': 'LegSecurityExchange',
  '620': 'LegSecurityDesc',
  '624': 'LegSide',
  '637': 'LegLastPx',
  '654': 'LegRefID',
  '686': 'LegPriceType',
  '687': 'LegQty',
  '711': 'UndInstrmtGrp',
  '715': 'ClearingBusinessDate',
  '762': 'SecuritySubType',
  '779': 'LastUpdateTime',
  '802': 'PtysSubGrp',
  '803': 'PartySubIDType',
  '810': 'UnderlyingPx',
  '828': 'TrdType',
  '830': 'TransferReason',
  '856': 'TradeReportType',
  '880': 'TrdMatchID',
  '882': 'UnderlyingDirtyPrice',
  '916': 'StartDate',
  '917': 'EndDate',
  '921': 'StartCash',
  '922': 'EndCash',
  '939': 'TrdRptStatus',
  '990': 'LegReportID',
  '1003': 'TradeID',
  '1012': 'SideTrdRegTimestamp',
  '1013': 'SideTrdRegTimestampType',
  '1016': 'SideTrdRegTS',
  '1040': 'SecondaryTradeID',
  '1057': 'AggressorIndicator',
  '1152': 'LegNumber',
  '1430': 'VenueType',
  '1500': 'MDStreamID',
  '1832': 'ClearedIndicator',
  '1851': 'StrategyLinkID',
  '1855': 'RelatedTradeGrp',
  '1856': 'RelatedTradeID',
  '1857': 'RelatedTradeIDSource',
  '2639': 'CommissionDataGrp',
  '2640': 'Commission Amount',
  '2642': 'Commission Basis',
  '2646': 'Commission Rate',
  '2649': 'Commission Leg Ref ID',
  '2668': 'TrdRegPublicationGrp',
  '2669': 'TrdRegPublicationType',
  '2670': 'TrdRegPublicationReason',
  '2490': 'TradeNumber',
  '5106': 'FundDesignation',
  '5149': 'Memo',
  '9373': 'LiquidityFlag',
  '10024': 'DifferentialPriceType',
  '10026': 'PriceQuoteCurrency',
  '10027': 'Side Regulatory Trade ID',
  '10028': 'Side Regulatory Trade ID Source',
  '10029': 'Side Regulatory Trade ID Event',
  '10030': 'Side Regulatory Trade ID Type',
  '10033': 'DifferentialPrice',
  '10034': 'SideRegulatoryTradeIDGrp',
  '10036': 'PackageID',
  '10039': 'SideOrigTradeID',
  '10053': 'SplitIndicator',
  '10055': 'LegAlternatePrice',
  '10056': 'LegInstrumentGUID',
  '20011': 'DealID',
  '20043': 'AlternatePrice',
  '20056': 'SettlementTradeID',
  '20060': 'VenueSubType',
  '20400': 'NonDisclosedIndicator',
  '37513': 'GUID',
  '37711': 'MarketDataTradeEntryID'
};

// Make the field map available globally
window.fixFieldMap = fixFieldMap;

// Function to get field name for a tag
function getFieldName(tag) {
  return fixFieldMap[tag] || `Field(${tag})`;
}

// Make the helper function available globally
window.getFieldName = getFieldName;