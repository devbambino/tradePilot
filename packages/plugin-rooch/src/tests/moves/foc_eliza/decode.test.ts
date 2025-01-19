import { describe, it, expect } from 'vitest';
import { decodeCharacterData } from '../../../moves/foc_eliza/decode';

describe('decodeCharacterData', () => {
    it('should handle style fields correctly', () => {
        const mockObjectStates = [
            {
              "id": "0x167f5fab11227c394905cbad1e8b25d0d12c6a881ba2d6899e9dbf8138eaecfd",
              "owner": "rooch1gh527qnwqtywlcglr0qjaczkg5t4lwgfyfjkj4kqenl9cmmfnj4sw89vyq",
              "owner_bitcoin_address": null,
              "flag": 0,
              "state_root": "0x5350415253455f4d45524b4c455f504c414345484f4c4445525f484153480000",
              "size": "0",
              "created_at": "1736963106000",
              "updated_at": "1736963106000",
              "object_type": "0x45e8af026e02c8efe11f1bc12ee05645175fb90922656956c0ccfe5c6f699cab::character::Character",
              "value": "0x0005446f62627900000009616e7468726f70696300000000044c446f6262792069732061206672656520617373697374616e742077686f2063686f6f73657320746f2068656c702062656361757365206f662068697320656e6f726d6f75732068656172742e4045787472656d656c79206465766f74656420616e642077696c6c20676f20746f20616e79206c656e67746820746f2068656c702068697320667269656e64732e4d537065616b7320696e20746869726420706572736f6e20616e6420686173206120756e697175652c20656e64656172696e6720776179206f662065787072657373696e672068696d73656c662e5b4b6e6f776e20666f72206869732063726561746976652070726f626c656d2d736f6c76696e672c206576656e2069662068697320736f6c7574696f6e732061726520736f6d6574696d657320756e636f6e76656e74696f6e616c2e04514f6e6365206120686f7573652d656c662c206e6f77206120667265652068656c7065722077686f2063686f6f73657320746f207365727665206f7574206f66206c6f766520616e64206c6f79616c74792e4246616d6f757320666f72206869732064656469636174696f6e20746f2068656c70696e6720486172727920506f7474657220616e642068697320667269656e64732e454b6e6f776e20666f72206869732063726561746976652c20696620736f6d6574696d6573206472616d617469632c20736f6c7574696f6e7320746f2070726f626c656d732e3856616c7565732066726565646f6d206275742063686f6f73657320746f2068656c702074686f73652068652063617265732061626f75742e0202097b7b75736572317d7d1a43616e20796f752068656c70206d65207769746820746869733f000000000005446f6262798001446f62627920776f756c642062652064656c69676874656420746f2068656c702120446f626279206c6976657320746f20736572766520676f6f6420667269656e64732120576861742063616e20446f62627920646f20746f206173736973743f20446f62627920686173206d616e7920637265617469766520696465617321000000000002097b7b75736572317d7d1c54686973206973206120646966666963756c742070726f626c656d2e000000000005446f626279b001446f626279206973206e6f7420616672616964206f6620646966666963756c742070726f626c656d732120446f6262792077696c6c2066696e642061207761792c206576656e20696620446f6262792068617320746f2069726f6e206869732068616e6473206c6174657221202842757420446f62627920776f6e27742c206265636175736520446f6262792069732061206672656520656c662077686f2068656c70732062792063686f696365212900000000000254446f6262792072656d696e647320667269656e64732074686174206576656e2074686520736d616c6c6573742068656c7065722063616e206d616b6520746865206269676765737420646966666572656e63652170446f62627920736179733a20275768656e20696e20646f7562742c207472792074686520756e636f6e76656e74696f6e616c20736f6c7574696f6e2127202842757420446f626279206164766973657320746f206265206361726566756c207769746820666c79696e672063617273290100050c456e74687573696173746963054c6f79616c1354686972642d706572736f6e207370656563680843726561746976650a50726f746563746976650405456167657209456e64656172696e67074465766f74656411536c696768746c79206472616d61746963050c54686972642d706572736f6e0c456e746875736961737469630748656c7066756c0b456e636f75726167696e6706517569726b7907054c6f79616c0c456e74687573696173746963084372656174697665074465766f7465640d467265652d73706972697465640a50726f746563746976650e556e636f6e76656e74696f6e616c05174d616769632028686f7573652d656c66207374796c65291843726561746976652070726f626c656d2d736f6c76696e671350726f74656374697665207365727669636573104c6f79616c20617373697374616e636518556e636f6e76656e74696f6e616c20736f6c7574696f6e7300",
              "decoded_value": {
                "abilities": 8,
                "type": "0x45e8af026e02c8efe11f1bc12ee05645175fb90922656956c0ccfe5c6f699cab::character::Character",
                "value": {
                  "adjectives": {
                    "abilities": 7,
                    "type": "0x1::string::String",
                    "field": [
                      "bytes"
                    ],
                    "value": [
                      [
                        "0x4c6f79616c"
                      ],
                      [
                        "0x456e74687573696173746963"
                      ],
                      [
                        "0x4372656174697665"
                      ],
                      [
                        "0x4465766f746564"
                      ],
                      [
                        "0x467265652d7370697269746564"
                      ],
                      [
                        "0x50726f74656374697665"
                      ],
                      [
                        "0x556e636f6e76656e74696f6e616c"
                      ]
                    ]
                  },
                  "bio": {
                    "abilities": 7,
                    "type": "0x1::string::String",
                    "field": [
                      "bytes"
                    ],
                    "value": [
                      [
                        "0x446f6262792069732061206672656520617373697374616e742077686f2063686f6f73657320746f2068656c702062656361757365206f662068697320656e6f726d6f75732068656172742e"
                      ],
                      [
                        "0x45787472656d656c79206465766f74656420616e642077696c6c20676f20746f20616e79206c656e67746820746f2068656c702068697320667269656e64732e"
                      ],
                      [
                        "0x537065616b7320696e20746869726420706572736f6e20616e6420686173206120756e697175652c20656e64656172696e6720776179206f662065787072657373696e672068696d73656c662e"
                      ],
                      [
                        "0x4b6e6f776e20666f72206869732063726561746976652070726f626c656d2d736f6c76696e672c206576656e2069662068697320736f6c7574696f6e732061726520736f6d6574696d657320756e636f6e76656e74696f6e616c2e"
                      ]
                    ]
                  },
                  "clients": [],
                  "id": {
                    "abilities": 7,
                    "type": "0x1::option::Option<0x1::string::String>",
                    "value": {
                      "vec": []
                    }
                  },
                  "imageModelProvider": {
                    "abilities": 7,
                    "type": "0x1::option::Option<0x1::string::String>",
                    "value": {
                      "vec": []
                    }
                  },
                  "imageVisionModelProvider": {
                    "abilities": 7,
                    "type": "0x1::option::Option<0x1::string::String>",
                    "value": {
                      "vec": []
                    }
                  },
                  "knowledge": {
                    "abilities": 7,
                    "type": "0x1::string::String",
                    "field": [
                      "bytes"
                    ],
                    "value": [
                      [
                        "0x4d616769632028686f7573652d656c66207374796c6529"
                      ],
                      [
                        "0x43726561746976652070726f626c656d2d736f6c76696e67"
                      ],
                      [
                        "0x50726f74656374697665207365727669636573"
                      ],
                      [
                        "0x4c6f79616c20617373697374616e6365"
                      ],
                      [
                        "0x556e636f6e76656e74696f6e616c20736f6c7574696f6e73"
                      ]
                    ]
                  },
                  "lore": {
                    "abilities": 7,
                    "type": "0x1::string::String",
                    "field": [
                      "bytes"
                    ],
                    "value": [
                      [
                        "0x4f6e6365206120686f7573652d656c662c206e6f77206120667265652068656c7065722077686f2063686f6f73657320746f207365727665206f7574206f66206c6f766520616e64206c6f79616c74792e"
                      ],
                      [
                        "0x46616d6f757320666f72206869732064656469636174696f6e20746f2068656c70696e6720486172727920506f7474657220616e642068697320667269656e64732e"
                      ],
                      [
                        "0x4b6e6f776e20666f72206869732063726561746976652c20696620736f6d6574696d6573206472616d617469632c20736f6c7574696f6e7320746f2070726f626c656d732e"
                      ],
                      [
                        "0x56616c7565732066726565646f6d206275742063686f6f73657320746f2068656c702074686f73652068652063617265732061626f75742e"
                      ]
                    ]
                  },
                  "messageExamples": [
                    {
                      "abilities": 7,
                      "type": "0x45e8af026e02c8efe11f1bc12ee05645175fb90922656956c0ccfe5c6f699cab::types::MessageTemplate",
                      "field": [
                        "user",
                        "content"
                      ],
                      "value": [
                        [
                          "{{user1}}",
                          {
                            "abilities": 7,
                            "type": "0x45e8af026e02c8efe11f1bc12ee05645175fb90922656956c0ccfe5c6f699cab::types::Content",
                            "value": {
                              "action": {
                                "abilities": 7,
                                "type": "0x1::option::Option<0x1::string::String>",
                                "value": {
                                  "vec": []
                                }
                              },
                              "attachments": [],
                              "inReplyTo": {
                                "abilities": 7,
                                "type": "0x1::option::Option<0x1::string::String>",
                                "value": {
                                  "vec": []
                                }
                              },
                              "source": {
                                "abilities": 7,
                                "type": "0x1::option::Option<0x1::string::String>",
                                "value": {
                                  "vec": []
                                }
                              },
                              "text": "Can you help me with this?",
                              "url": {
                                "abilities": 7,
                                "type": "0x1::option::Option<0x1::string::String>",
                                "value": {
                                  "vec": []
                                }
                              }
                            }
                          }
                        ],
                        [
                          "Dobby",
                          {
                            "abilities": 7,
                            "type": "0x45e8af026e02c8efe11f1bc12ee05645175fb90922656956c0ccfe5c6f699cab::types::Content",
                            "value": {
                              "action": {
                                "abilities": 7,
                                "type": "0x1::option::Option<0x1::string::String>",
                                "value": {
                                  "vec": []
                                }
                              },
                              "attachments": [],
                              "inReplyTo": {
                                "abilities": 7,
                                "type": "0x1::option::Option<0x1::string::String>",
                                "value": {
                                  "vec": []
                                }
                              },
                              "source": {
                                "abilities": 7,
                                "type": "0x1::option::Option<0x1::string::String>",
                                "value": {
                                  "vec": []
                                }
                              },
                              "text": "Dobby would be delighted to help! Dobby lives to serve good friends! What can Dobby do to assist? Dobby has many creative ideas!",
                              "url": {
                                "abilities": 7,
                                "type": "0x1::option::Option<0x1::string::String>",
                                "value": {
                                  "vec": []
                                }
                              }
                            }
                          }
                        ]
                      ]
                    },
                    {
                      "abilities": 7,
                      "type": "0x45e8af026e02c8efe11f1bc12ee05645175fb90922656956c0ccfe5c6f699cab::types::MessageTemplate",
                      "field": [
                        "user",
                        "content"
                      ],
                      "value": [
                        [
                          "{{user1}}",
                          {
                            "abilities": 7,
                            "type": "0x45e8af026e02c8efe11f1bc12ee05645175fb90922656956c0ccfe5c6f699cab::types::Content",
                            "value": {
                              "action": {
                                "abilities": 7,
                                "type": "0x1::option::Option<0x1::string::String>",
                                "value": {
                                  "vec": []
                                }
                              },
                              "attachments": [],
                              "inReplyTo": {
                                "abilities": 7,
                                "type": "0x1::option::Option<0x1::string::String>",
                                "value": {
                                  "vec": []
                                }
                              },
                              "source": {
                                "abilities": 7,
                                "type": "0x1::option::Option<0x1::string::String>",
                                "value": {
                                  "vec": []
                                }
                              },
                              "text": "This is a difficult problem.",
                              "url": {
                                "abilities": 7,
                                "type": "0x1::option::Option<0x1::string::String>",
                                "value": {
                                  "vec": []
                                }
                              }
                            }
                          }
                        ],
                        [
                          "Dobby",
                          {
                            "abilities": 7,
                            "type": "0x45e8af026e02c8efe11f1bc12ee05645175fb90922656956c0ccfe5c6f699cab::types::Content",
                            "value": {
                              "action": {
                                "abilities": 7,
                                "type": "0x1::option::Option<0x1::string::String>",
                                "value": {
                                  "vec": []
                                }
                              },
                              "attachments": [],
                              "inReplyTo": {
                                "abilities": 7,
                                "type": "0x1::option::Option<0x1::string::String>",
                                "value": {
                                  "vec": []
                                }
                              },
                              "source": {
                                "abilities": 7,
                                "type": "0x1::option::Option<0x1::string::String>",
                                "value": {
                                  "vec": []
                                }
                              },
                              "text": "Dobby is not afraid of difficult problems! Dobby will find a way, even if Dobby has to iron his hands later! (But Dobby won't, because Dobby is a free elf who helps by choice!)",
                              "url": {
                                "abilities": 7,
                                "type": "0x1::option::Option<0x1::string::String>",
                                "value": {
                                  "vec": []
                                }
                              }
                            }
                          }
                        ]
                      ]
                    }
                  ],
                  "modelEndpointOverride": {
                    "abilities": 7,
                    "type": "0x1::option::Option<0x1::string::String>",
                    "value": {
                      "vec": []
                    }
                  },
                  "modelProvider": "anthropic",
                  "name": "Dobby",
                  "plugins": [],
                  "postExamples": {
                    "abilities": 7,
                    "type": "0x1::string::String",
                    "field": [
                      "bytes"
                    ],
                    "value": [
                      [
                        "0x446f6262792072656d696e647320667269656e64732074686174206576656e2074686520736d616c6c6573742068656c7065722063616e206d616b6520746865206269676765737420646966666572656e636521"
                      ],
                      [
                        "0x446f62627920736179733a20275768656e20696e20646f7562742c207472792074686520756e636f6e76656e74696f6e616c20736f6c7574696f6e2127202842757420446f626279206164766973657320746f206265206361726566756c207769746820666c79696e67206361727329"
                      ]
                    ]
                  },
                  "style": {
                    "abilities": 7,
                    "type": "0x45e8af026e02c8efe11f1bc12ee05645175fb90922656956c0ccfe5c6f699cab::types::Style",
                    "value": {
                      "all": {
                        "abilities": 7,
                        "type": "0x1::string::String",
                        "field": [
                          "bytes"
                        ],
                        "value": [
                          [
                            "0x456e74687573696173746963"
                          ],
                          [
                            "0x4c6f79616c"
                          ],
                          [
                            "0x54686972642d706572736f6e20737065656368"
                          ],
                          [
                            "0x4372656174697665"
                          ],
                          [
                            "0x50726f74656374697665"
                          ]
                        ]
                      },
                      "chat": {
                        "abilities": 7,
                        "type": "0x1::string::String",
                        "field": [
                          "bytes"
                        ],
                        "value": [
                          [
                            "0x4561676572"
                          ],
                          [
                            "0x456e64656172696e67"
                          ],
                          [
                            "0x4465766f746564"
                          ],
                          [
                            "0x536c696768746c79206472616d61746963"
                          ]
                        ]
                      },
                      "post": {
                        "abilities": 7,
                        "type": "0x1::string::String",
                        "field": [
                          "bytes"
                        ],
                        "value": [
                          [
                            "0x54686972642d706572736f6e"
                          ],
                          [
                            "0x456e74687573696173746963"
                          ],
                          [
                            "0x48656c7066756c"
                          ],
                          [
                            "0x456e636f75726167696e67"
                          ],
                          [
                            "0x517569726b79"
                          ]
                        ]
                      }
                    }
                  },
                  "system": {
                    "abilities": 7,
                    "type": "0x1::option::Option<0x1::string::String>",
                    "value": {
                      "vec": []
                    }
                  },
                  "topics": {
                    "abilities": 7,
                    "type": "0x1::string::String",
                    "field": [
                      "bytes"
                    ],
                    "value": [
                      [
                        "0x"
                      ]
                    ]
                  },
                  "twitterProfile": {
                    "abilities": 7,
                    "type": "0x1::option::Option<0x45e8af026e02c8efe11f1bc12ee05645175fb90922656956c0ccfe5c6f699cab::types::TwitterProfile>",
                    "value": {
                      "vec": []
                    }
                  },
                  "username": {
                    "abilities": 7,
                    "type": "0x1::option::Option<0x1::string::String>",
                    "value": {
                      "vec": []
                    }
                  }
                }
              },
              "display_fields": null
            }
        ];

        const expectedCharacterData = {
            "name": "Dobby",
            "clients": [],
            "modelProvider": "anthropic",
            "plugins": [],
            "bio": [
                "Dobby is a free assistant who chooses to help because of his enormous heart.",
                "Extremely devoted and will go to any length to help his friends.",
                "Speaks in third person and has a unique, endearing way of expressing himself.",
                "Known for his creative problem-solving, even if his solutions are sometimes unconventional."
            ],
            "lore": [
                "Once a house-elf, now a free helper who chooses to serve out of love and loyalty.",
                "Famous for his dedication to helping Harry Potter and his friends.",
                "Known for his creative, if sometimes dramatic, solutions to problems.",
                "Values freedom but chooses to help those he cares about."
            ],
            "knowledge": [
                "Magic (house-elf style)",
                "Creative problem-solving",
                "Protective services",
                "Loyal assistance",
                "Unconventional solutions"
            ],
            "messageExamples": [
                [
                    {
                        "user": "{{user1}}",
                        "content": {
                            "attachments": [],
                            "text": "Can you help me with this?"
                        }
                    },
                    {
                        "user": "Dobby",
                        "content": {
                            "attachments": [],
                            "text": "Dobby would be delighted to help! Dobby lives to serve good friends! What can Dobby do to assist? Dobby has many creative ideas!"
                        }
                    }
                ],
                [
                    {
                        "user": "{{user1}}",
                        "content": {
                            "attachments": [],
                            "text": "This is a difficult problem."
                        }
                    },
                    {
                        "user": "Dobby",
                        "content": {
                            "attachments": [],
                            "text": "Dobby is not afraid of difficult problems! Dobby will find a way, even if Dobby has to iron his hands later! (But Dobby won't, because Dobby is a free elf who helps by choice!)"
                        }
                    }
                ]
            ],
            "postExamples": [
                "Dobby reminds friends that even the smallest helper can make the biggest difference!",
                "Dobby says: 'When in doubt, try the unconventional solution!' (But Dobby advises to be careful with flying cars)"
            ],
            "topics": [
                ""
            ],
            "style": {
                "all": [
                    "Enthusiastic",
                    "Loyal",
                    "Third-person speech",
                    "Creative",
                    "Protective"
                ],
                "chat": [
                    "Eager",
                    "Endearing",
                    "Devoted",
                    "Slightly dramatic"
                ],
                "post": [
                    "Third-person",
                    "Enthusiastic",
                    "Helpful",
                    "Encouraging",
                    "Quirky"
                ]
            },
            "adjectives": [
                "Loyal",
                "Enthusiastic",
                "Creative",
                "Devoted",
                "Free-spirited",
                "Protective",
                "Unconventional"
            ]
        };

        const result = decodeCharacterData(mockObjectStates[0].decoded_value.value);
        expect(result).toEqual(expectedCharacterData);
    });

    it('should handle null or undefined decoded_value input', () => {
        const resultNull = decodeCharacterData(null);
        const resultUndefined = decodeCharacterData(undefined);

        const expectedEmptyData = {
            name: '',
            clients: [],
            modelProvider: '',
            plugins: [],
            bio: [],
            lore: [],
            knowledge: [],
            messageExamples: [],
            postExamples: [],
            topics: [],
            style: {
                all: [],
                chat: [],
                post: []
            },
            adjectives: []
        };

        expect(resultNull).toEqual(expectedEmptyData);
        expect(resultUndefined).toEqual(expectedEmptyData);
    });

    it('should handle minimal valid character data', () => {
        const minimalInput = {
            name: "Test Character",
            modelProvider: "test-provider",
            style: {
                value: {
                    all: { value: [] },
                    chat: { value: [] },
                    post: { value: [] }
                }
            }
        };

        const result = decodeCharacterData(minimalInput);

        expect(result).toEqual({
            name: "Test Character",
            modelProvider: "test-provider",
            plugins: [],
            clients: [],
            bio: [],
            lore: [],
            messageExamples: [],
            postExamples: [],
            topics: [],
            style: {
                all: [],
                chat: [],
                post: []
            },
            adjectives: [],
            knowledge: []
        });
    });

    it('should handle empty arrays and fields', () => {
        const emptyArraysInput = {
            name: "Test Character",
            modelProvider: "test-provider",
            plugins: { value: [] },
            clients: { value: [] },
            bio: { value: [] },
            lore: { value: [] },
            messageExamples: [],
            postExamples: { value: [] },
            topics: { value: [] },
            style: {
                value: {
                    all: { value: [] },
                    chat: { value: [] },
                    post: { value: [] }
                }
            },
            adjectives: { value: [] },
            knowledge: { value: [] }
        };

        const result = decodeCharacterData(emptyArraysInput);

        expect(result).toEqual({
            name: "Test Character",
            modelProvider: "test-provider",
            plugins: [],
            clients: [],
            bio: [],
            lore: [],
            messageExamples: [],
            postExamples: [],
            topics: [],
            style: {
                all: [],
                chat: [],
                post: []
            },
            adjectives: [],
            knowledge: []
        });
    });

    it('should handle missing optional fields', () => {
        const inputWithMissingOptionals = {
            name: "Test Character",
            modelProvider: "test-provider",
            plugins: { value: ["plugin1"] },
            clients: { value: ["client1"] },
            style: {
                value: {
                    all: { value: ["style1"] },
                    chat: { value: ["chat1"] },
                    post: { value: ["post1"] }
                }
            }
        };

        const result = decodeCharacterData(inputWithMissingOptionals);

        expect(result).toEqual({
            name: "Test Character",
            modelProvider: "test-provider",
            plugins: ["plugin1"],
            clients: ["client1"],
            bio: [],
            lore: [],
            messageExamples: [],
            postExamples: [],
            topics: [],
            style: {
                all: ["style1"],
                chat: ["chat1"],
                post: ["post1"]
            },
            adjectives: [],
            knowledge: [],
        });
    });

    it('should handle nested MessageTemplate structures correctly', () => {
        const inputWithMessages = {
            name: "Test Character",
            modelProvider: "test-provider",
            messageExamples: [
                {
                    value: [
                        [
                            "user1",
                            {
                                value: {
                                    text: "Hello",
                                    action: { value: "waves" },
                                    source: { value: "chat" },
                                    url: { value: "http://test.com" },
                                    inReplyTo: { value: "msg123" },
                                    attachments: {
                                        value: [
                                            {
                                                id: "media1",
                                                url: "http://test.com/image.jpg",
                                                title: "Test Image",
                                                source: "gallery",
                                                description: "Test description",
                                                text: "Image text",
                                                contentType: "image/jpeg"
                                            }
                                        ]
                                    }
                                }
                            }
                        ]
                    ]
                }
            ],
            style: {
                value: {
                    all: { value: [] },
                    chat: { value: [] },
                    post: { value: [] }
                }
            }
        };

        const result = decodeCharacterData(inputWithMessages);

        expect(result.messageExamples).toEqual([
            [
                {
                    user: "user1",
                    content: {
                        text: "Hello",
                        action: "waves",
                        source: "chat",
                        url: "http://test.com",
                        inReplyTo: "msg123",
                        attachments: [
                            {
                                id: "media1",
                                url: "http://test.com/image.jpg",
                                title: "Test Image",
                                source: "gallery",
                                description: "Test description",
                                text: "Image text",
                                contentType: "image/jpeg"
                            }
                        ]
                    }
                }
            ]
        ]);
    });

    it('should handle Twitter profile data correctly', () => {
        const inputWithTwitterProfile = {
            name: "Test Character",
            modelProvider: "test-provider",
            twitterProfile: {
                type: "0x1::option::Option<TwitterProfile>",
                value: [{
                    id: "123456",
                    username: "testuser",
                    screenName: "Test User",
                    bio: "Test bio",
                    nicknames: ["nick1", "nick2"]
                }]
            },
            style: {
                value: {
                    all: { value: [] },
                    chat: { value: [] },
                    post: { value: [] }
                }
            }
        };

        const result = decodeCharacterData(inputWithTwitterProfile);

        expect(result.twitterProfile).toEqual({
            id: "123456",
            username: "testuser",
            screenName: "Test User",
            bio: "Test bio",
            nicknames: ["nick1", "nick2"]
        });
    });

    it('should handle content with multiple attachments correctly', () => {
        const inputWithAttachments = {
            name: "Test Character",
            modelProvider: "test-provider",
            messageExamples: [
                {
                    value: [
                        [
                            "user1",
                            {
                                value: {
                                    text: "Check these files",
                                    attachments: {
                                        value: [
                                            {
                                                id: "media1",
                                                url: "http://test.com/image1.jpg",
                                                title: "First Image",
                                                source: "gallery",
                                                description: "Description 1",
                                                text: "Image 1 text",
                                                contentType: "image/jpeg"
                                            },
                                            {
                                                id: "media2",
                                                url: "http://test.com/doc.pdf",
                                                title: "Document",
                                                source: "upload",
                                                description: "Description 2",
                                                text: "Document text",
                                                contentType: "application/pdf"
                                            }
                                        ]
                                    }
                                }
                            }
                        ]
                    ]
                }
            ],
            style: {
                value: {
                    all: { value: [] },
                    chat: { value: [] },
                    post: { value: [] }
                }
            }
        };

        const result = decodeCharacterData(inputWithAttachments);

        expect(result.messageExamples[0][0].content.attachments).toEqual([
            {
                id: "media1",
                url: "http://test.com/image1.jpg",
                title: "First Image",
                source: "gallery",
                description: "Description 1",
                text: "Image 1 text",
                contentType: "image/jpeg"
            },
            {
                id: "media2",
                url: "http://test.com/doc.pdf",
                title: "Document",
                source: "upload",
                description: "Description 2",
                text: "Document text",
                contentType: "application/pdf"
            }
        ]);
    });

    it('should handle various string formats correctly', () => {
        const inputWithDifferentStrings = {
            name: "Hello",
            modelProvider: "test-provider",
            bio: {
                value: [
                    ["0x576f726c64"] // hex for "World"
                ]
            },
            username: {
                type: "0x1::option::Option<string>",
                value: [
                    ["0xe4bda0e5a5bd"]  // hex for "你好"
                ]
            },
            system: {
                value: []  // empty string
            },
            style: {
                value: {
                    all: { value: [] },
                    chat: { value: [] },
                    post: { value: [] }
                }
            }
        };

        const result = decodeCharacterData(inputWithDifferentStrings);

        expect(result).toMatchObject({
            name: "Hello",
            username: "你好",
            bio: ["World"],
            modelProvider: "test-provider"
        });
    });
});